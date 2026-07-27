import { World } from '../ecs/World';

const VERT_SRC = `#version 300 es
in vec2 aPosition;
in vec2 aTexCoord;
in vec4 aColor;
uniform mat3 uProjection;
uniform mat3 uCamera;
out vec2 vTexCoord;
out vec4 vColor;
void main() {
    vec3 pos = uProjection * uCamera * vec3(aPosition, 1.0);
    gl_Position = vec4(pos.xy, 0.0, 1.0);
    vTexCoord = aTexCoord;
    vColor = aColor;
}`;

const FRAG_SRC = `#version 300 es
precision mediump float;
in vec2 vTexCoord;
in vec4 vColor;
uniform sampler2D uTexture;
uniform float uUseTexture;
out vec4 fragColor;
void main() {
    vec4 texColor = uUseTexture > 0.5 ? texture(uTexture, vTexCoord) : vec4(1.0);
    fragColor = texColor * vColor;
}`;

interface SpriteInstance {
    x: number;
    y: number;
    w: number;
    h: number;
    srcX: number;
    srcY: number;
    srcW: number;
    srcH: number;
    textureKey: string;
    alpha: number;
    tint: string;
    flipX: boolean;
    layer: number;
    texW: number;
    texH: number;
}

const MAX_SPRITES = 10000;
const FLOATS_PER_VERTEX = 8;
const INDICES_PER_SPRITE = 6;
const VERTICES_PER_SPRITE = 4;

export class WebGLRenderer {
    private gl: WebGL2RenderingContext;
    private program!: WebGLProgram;
    private vao!: WebGLVertexArrayObject;
    private vbo!: WebGLBuffer;
    private ebo!: WebGLBuffer;
    private projectionMatrix: Float32Array = new Float32Array(9);
    private cameraMatrix: Float32Array = new Float32Array(9);
    private projectionLoc!: WebGLUniformLocation;
    private cameraLoc!: WebGLUniformLocation;
    private textureLoc!: WebGLUniformLocation;
    private useTextureLoc!: WebGLUniformLocation;
    private textures: Map<string, WebGLTexture> = new Map();
    private whiteTexture!: WebGLTexture;
    private instances: SpriteInstance[] = [];
    private vertexData: Float32Array;
    private indexData: Uint32Array;
    private canvasWidth: number = 1280;
    private canvasHeight: number = 720;
    private blendMode: 'normal' | 'additive' | 'multiply' = 'normal';

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        this.vertexData = new Float32Array(MAX_SPRITES * VERTICES_PER_SPRITE * FLOATS_PER_VERTEX);
        this.indexData = new Uint32Array(MAX_SPRITES * INDICES_PER_SPRITE);
        this.initShaders();
        this.initBuffers();
        this.initWhiteTexture();
        this.initProjection();
    }

    private initShaders(): void {
        const gl = this.gl;
        const vs = this.compileShader(gl.VERTEX_SHADER, VERT_SRC);
        const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAG_SRC);
        this.program = gl.createProgram()!;
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('[WebGLRenderer] Shader link error:', gl.getProgramInfoLog(this.program));
        }
        gl.useProgram(this.program);
        this.projectionLoc = gl.getUniformLocation(this.program, 'uProjection')!;
        this.cameraLoc = gl.getUniformLocation(this.program, 'uCamera')!;
        this.textureLoc = gl.getUniformLocation(this.program, 'uTexture')!;
        this.useTextureLoc = gl.getUniformLocation(this.program, 'uUseTexture')!;
    }

    private compileShader(type: number, source: string): WebGLShader {
        const gl = this.gl;
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('[WebGLRenderer] Shader compile error:', gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    private initBuffers(): void {
        const gl = this.gl;
        this.vao = gl.createVertexArray()!;
        gl.bindVertexArray(this.vao);

        this.vbo = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);

        const aPosition = gl.getAttribLocation(this.program, 'aPosition');
        const aTexCoord = gl.getAttribLocation(this.program, 'aTexCoord');
        const aColor = gl.getAttribLocation(this.program, 'aColor');

        const stride = FLOATS_PER_VERTEX * 4;
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(aTexCoord);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, stride, 8);
        gl.enableVertexAttribArray(aColor);
        gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, stride, 16);

        this.ebo = gl.createBuffer()!;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        this.bufferIndices();
        gl.bindVertexArray(null);
    }

    private bufferIndices(): void {
        const gl = this.gl;
        for (let i = 0, v = 0; i < MAX_SPRITES; i++, v += 4) {
            const base = i * 6;
            this.indexData[base] = v;
            this.indexData[base + 1] = v + 1;
            this.indexData[base + 2] = v + 2;
            this.indexData[base + 3] = v;
            this.indexData[base + 4] = v + 2;
            this.indexData[base + 5] = v + 3;
        }
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexData, gl.STATIC_DRAW);
    }

    private initWhiteTexture(): void {
        const gl = this.gl;
        this.whiteTexture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    }

    private initProjection(): void {
        this.setProjection(this.canvasWidth, this.canvasHeight);
    }

    public setProjection(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
        const sx = 2 / width;
        const sy = -2 / height;
        this.projectionMatrix.set([
            sx, 0, 0,
            0, sy, 0,
            -1, 1, 1
        ]);
    }

    public setCamera(x: number, y: number, zoom: number): void {
        const z = zoom;
        const cx = -x * z;
        const cy = -y * z;
        this.cameraMatrix.set([
            z, 0, 0,
            0, z, 0,
            cx, cy, 1
        ]);
    }

    public resize(width: number, height: number): void {
        this.gl.viewport(0, 0, width, height);
        this.setProjection(width, height);
    }

    public loadTexture(key: string, source: TexImageSource): void {
        const gl = this.gl;
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.textures.set(key, tex);
    }

    public setBlendMode(mode: 'normal' | 'additive' | 'multiply'): void {
        this.blendMode = mode;
    }

    public begin(): void {
        this.instances = [];
    }

    public drawSprite(
        x: number, y: number, w: number, h: number,
        textureKey: string,
        srcX: number = 0, srcY: number = 0, srcW?: number, srcH?: number,
        alpha: number = 1, tint: string = '#ffffff', flipX: boolean = false,
        layer: number = 0
    ): void {
        const texW = srcW || w;
        const texH = srcH || h;
        this.instances.push({
            x, y, w, h, srcX, srcY, srcW: texW, srcH: texH,
            textureKey, alpha, tint, flipX, layer,
            texW: texW, texH: texH
        });
    }

    public drawRect(
        x: number, y: number, w: number, h: number,
        color: string, alpha: number = 1, layer: number = 0
    ): void {
        this.instances.push({
            x, y, w, h, srcX: 0, srcY: 0, srcW: 1, srcH: 1,
            textureKey: '__white__', alpha, tint: color, flipX: false,
            layer, texW: 1, texH: 1
        });
    }

    public end(_world: World | null = null): void {
        if (this.instances.length === 0) return;

        this.instances.sort((a, b) => a.layer - b.layer);

        const gl = this.gl;

        this.applyBlendMode();

        gl.useProgram(this.program);
        gl.uniformMatrix3fv(this.projectionLoc, false, this.projectionMatrix);
        gl.uniformMatrix3fv(this.cameraLoc, false, this.cameraMatrix);

        gl.bindVertexArray(this.vao);

        let offset = 0;
        let spriteCount = 0;
        let currentTexture: WebGLTexture | null = null;
        let batchStart = 0;

        const flush = (endIdx: number) => {
            if (endIdx <= batchStart) return;

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData.subarray(0, offset));

            if (currentTexture) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, currentTexture);
                gl.uniform1i(this.textureLoc, 0);
                gl.uniform1f(this.useTextureLoc, 1.0);
            } else {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);
                gl.uniform1i(this.textureLoc, 0);
                gl.uniform1f(this.useTextureLoc, 0.0);
            }

            gl.drawElements(gl.TRIANGLES, (endIdx - batchStart) * INDICES_PER_SPRITE, gl.UNSIGNED_INT, batchStart * INDICES_PER_SPRITE * 4);

            batchStart = endIdx;
            offset = 0;
            spriteCount = 0;
        };

        for (let i = 0; i < this.instances.length; i++) {
            const inst = this.instances[i];

            const tex = inst.textureKey === '__white__'
                ? this.whiteTexture
                : this.textures.get(inst.textureKey) || this.whiteTexture;

            if (tex !== currentTexture && spriteCount > 0) {
                flush(i);
                currentTexture = tex;
            }

            if (tex !== this.whiteTexture && tex !== currentTexture) {
                currentTexture = tex;
            }

            let r = 1, g = 1, b = 1;
            if (inst.tint !== '#ffffff' && inst.tint !== 'white') {
                const hex = inst.tint.replace('#', '');
                if (hex.length === 6) {
                    r = parseInt(hex.substring(0, 2), 16) / 255;
                    g = parseInt(hex.substring(2, 4), 16) / 255;
                    b = parseInt(hex.substring(4, 6), 16) / 255;
                }
            }

            const u0 = inst.srcX / (inst.texW || 1);
            const v0 = inst.srcY / (inst.texH || 1);
            const u1 = (inst.srcX + inst.w) / (inst.texW || 1);
            const v1 = (inst.srcY + inst.h) / (inst.texH || 1);

            const vu0 = inst.flipX ? u1 : u0;
            const vu1 = inst.flipX ? u0 : u1;

            const base = offset;
            this.vertexData[base] = inst.x;
            this.vertexData[base + 1] = inst.y;
            this.vertexData[base + 2] = vu0;
            this.vertexData[base + 3] = v0;
            this.vertexData[base + 4] = r;
            this.vertexData[base + 5] = g;
            this.vertexData[base + 6] = b;
            this.vertexData[base + 7] = inst.alpha;

            this.vertexData[base + 8] = inst.x + inst.w;
            this.vertexData[base + 9] = inst.y;
            this.vertexData[base + 10] = vu1;
            this.vertexData[base + 11] = v0;
            this.vertexData[base + 12] = r;
            this.vertexData[base + 13] = g;
            this.vertexData[base + 14] = b;
            this.vertexData[base + 15] = inst.alpha;

            this.vertexData[base + 16] = inst.x + inst.w;
            this.vertexData[base + 17] = inst.y + inst.h;
            this.vertexData[base + 18] = vu1;
            this.vertexData[base + 19] = v1;
            this.vertexData[base + 20] = r;
            this.vertexData[base + 21] = g;
            this.vertexData[base + 22] = b;
            this.vertexData[base + 23] = inst.alpha;

            this.vertexData[base + 24] = inst.x;
            this.vertexData[base + 25] = inst.y + inst.h;
            this.vertexData[base + 26] = vu0;
            this.vertexData[base + 27] = v1;
            this.vertexData[base + 28] = r;
            this.vertexData[base + 29] = g;
            this.vertexData[base + 30] = b;
            this.vertexData[base + 31] = inst.alpha;

            offset += VERTICES_PER_SPRITE * FLOATS_PER_VERTEX;
            spriteCount++;
        }

        flush(this.instances.length);
        gl.bindVertexArray(null);
    }

    private applyBlendMode(): void {
        const gl = this.gl;
        switch (this.blendMode) {
            case 'normal':
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                break;
            case 'additive':
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                break;
            case 'multiply':
                gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA);
                break;
        }
    }
}
