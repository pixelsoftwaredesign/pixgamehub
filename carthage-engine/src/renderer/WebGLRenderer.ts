export class WebGLRenderer {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram | null = null;

    constructor(canvas: HTMLCanvasElement) {
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            throw new Error("WebGL 2.0 n'est pas supporté par votre navigateur.");
        }
        this.gl = gl;
        this.initShaders();
    }

    private initShaders(): void {
        const gl = this.gl;

        const vsSource = `#version 300 es
            in vec2 a_position;
            uniform vec2 u_resolution;
            uniform vec2 u_camera;
            void main() {
                vec2 adjustedPos = a_position - u_camera;
                vec2 zeroToOne = adjustedPos / u_resolution;
                vec2 zeroToTwo = zeroToOne * 2.0;
                vec2 clipSpace = zeroToTwo - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
            }
        `;

        const fsSource = `#version 300 es
            precision highp float;
            uniform vec4 u_color;
            out vec4 outColor;
            void main() {
                outColor = u_color;
            }
        `;

        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fsSource);
        if (vertexShader && fragmentShader) {
            this.program = this.createProgram(gl, vertexShader, fragmentShader);
        }
    }

    private createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Erreur de compilation du shader:', gl.getShaderInfoLog(shader));
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
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Erreur de liaison du programme:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        return program;
    }

    public clear(r: number, g: number, b: number, a: number): void {
        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    public drawRect(x: number, y: number, width: number, height: number, color: [number, number, number, number], cameraX: number, cameraY: number): void {
        if (!this.program) return;
        const gl = this.gl;

        gl.useProgram(this.program);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        const x1 = x;
        const y1 = y;
        const x2 = x + width;
        const y2 = y + height;

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2,
        ]), gl.STATIC_DRAW);

        const posAttrLoc = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(posAttrLoc);
        gl.vertexAttribPointer(posAttrLoc, 2, gl.FLOAT, false, 0, 0);

        const resUniformLoc = gl.getUniformLocation(this.program, 'u_resolution');
        gl.uniform2f(resUniformLoc, gl.canvas.width, gl.canvas.height);

        const camUniformLoc = gl.getUniformLocation(this.program, 'u_camera');
        gl.uniform2f(camUniformLoc, cameraX, cameraY);

        const colorUniformLoc = gl.getUniformLocation(this.program, 'u_color');
        gl.uniform4f(colorUniformLoc, color[0], color[1], color[2], color[3]);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}
