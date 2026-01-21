import { EventEmitter } from 'events';

class StatusBus extends EventEmitter {
    log(message: string, type: 'info' | 'wait' | 'success' | 'error' = 'info') {
        this.emit('log', { 
            message, 
            type, 
            timestamp: new Date().toLocaleTimeString() 
        });
    }
}

export const statusBus = new StatusBus();
