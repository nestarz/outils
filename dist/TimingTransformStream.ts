export interface TimingTransformStreamHandlers {
    start(controller: TransformStreamDefaultController): void;
    transform(chunk: any, controller: TransformStreamDefaultController): void;
    flush(controller: TransformStreamDefaultController): void;
}

export class TimingTransformStream implements TimingTransformStreamHandlers {
    private startTime: number | null = null;
    private endTime: number | null = null;

    start(controller: TransformStreamDefaultController): void {
        this.startTime = performance.now();
        console.log('Timing started');
    }

    transform(chunk: any, controller: TransformStreamDefaultController): void {
        controller.enqueue(chunk); // Simply pass the chunk along
    }

    flush(controller: TransformStreamDefaultController): void {
        this.endTime = performance.now();
        console.log('Timing ended');

        if (this.startTime !== null) {
            console.log(`Duration: ${this.endTime - this.startTime}ms`);
        }
    }
}

export default TimingTransformStream;
