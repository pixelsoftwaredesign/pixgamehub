export class SpriteBatchRenderer {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram | null = null;
    private textures: Map<string, WebGLTexture> = new Map();

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        this.initShaders();
    }

    private initShaders(): void {
        const gl = this.gl;

        const vsSource = `#version 300 es
            in vec2 a_position;
            in vec2 a_texCoord;
            uniform vec2 u_resolution;
            uniform vec2 u_camera;
            out vec2 v_texCoord;
            void main() {
                vec2 adjustedPos = a_position - u_camera;
                vec2 zeroToOne = adjustedPos / u_resolution;
                vec2 zeroToTwo = zeroToOne * 2.0;
                vec2 clipSpace = zeroToTwo - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_texCoord = a_texCoord;
            }
        `;

        const fsSource = `#version 300 es
            precision highp float;
            in vec2 v_texCoord;
            uniform sampler2D u_texture;
            out vec4 outColor;
            void main() {
                outColor = texture(u_texture, v_texCoord);
            }
        `;

        const vs = this.createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = this.createShader(gl, gl.FRAGMENT_SHADER, fsSource);
        if (vs && fs) {
            this.program = this.createProgram(gl, vs, fs);
        }
    }

    private createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    private createProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram | null {
        const program = gl.createProgram();
        if (!program) return null;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        return program;
    }

    public loadTexture(key: string, img: HTMLImageElement): void {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        this.textures.set(key, texture!);
    }

    public drawSprite(textureKey: string, x: number, y: number, width: number, height: number, cameraX: number, cameraY: number, flipX: boolean = false): void {
        if (!this.program || !this.textures.has(textureKey)) return;
        const gl = this.gl;

        gl.useProgram(this.program);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.get(textureKey)!);

        const x1 = x;
        const y1 = y;
        const x2 = x + width;
        const y2 = y + height;

        const u1 = flipX ? 1.0 : 0.0;
        const u2 = flipX ? 0.0 : 1.0;

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            x1, y1, u1, 0.0,
            x2, y1, u2, 0.0,
            x1, y2, u1, 1.0,
            x1, y2, u1, 1.0,
            x2, y1, u2, 0.0,
            x2, y2, u2, 1.0,
        ]), gl.STATIC_DRAW);

        const posAttrLoc = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(posAttrLoc);
        gl.vertexAttribPointer(posAttrLoc, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);

        const texAttrLoc = gl.getAttribLocation(this.program, 'a_texCoord');
        gl.enableVertexAttribArray(texAttrLoc);
        gl.vertexAttribPointer(texAttrLoc, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

        gl.uniform2f(gl.getUniformLocation(this.program, 'u_resolution'), gl.canvas.width, gl.canvas.height);
        gl.uniform2f(gl.getUniformLocation(this.program, 'u_camera'), cameraX, cameraY);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}
