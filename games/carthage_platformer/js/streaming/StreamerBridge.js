export class StreamerBridge {
    constructor(canvas) {
        this.canvas = canvas;
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.startTime = 0;
    }

    initCapture(fps) {
        try {
            this.mediaStream = this.canvas.captureStream(fps || 60);
            return this.mediaStream;
        } catch (e) {
            console.warn('captureStream non supporté:', e);
            return null;
        }
    }

    attachToVideoElement(videoElement) {
        if (this.mediaStream && videoElement) {
            videoElement.srcObject = this.mediaStream;
            videoElement.play().catch(() => {});
        }
    }

    startRecording() {
        if (!this.mediaStream || this.isRecording) return false;

        this.recordedChunks = [];
        const options = { mimeType: 'video/webm;codecs=vp9' };

        try {
            this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
        } catch (e) {
            try {
                this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType: 'video/webm' });
            } catch (e2) {
                console.warn('MediaRecorder non supporté');
                return false;
            }
        }

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                this.recordedChunks.push(e.data);
            }
        };

        this.mediaRecorder.start(100);
        this.isRecording = true;
        this.startTime = Date.now();
        return true;
    }

    stopRecording() {
        if (!this.mediaRecorder || !this.isRecording) return null;

        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                this.isRecording = false;
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                resolve(blob);
            };
            this.mediaRecorder.stop();
        });
    }

    async exportRecording(filename) {
        const blob = await this.stopRecording();
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename || `carthage_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(url);
            a.remove();
        }, 100);
    }

    getRecordingDuration() {
        if (!this.isRecording) return 0;
        return (Date.now() - this.startTime) / 1000;
    }

    getFormattedDuration() {
        const s = this.getRecordingDuration();
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    getMediaStream() {
        return this.mediaStream;
    }
}
