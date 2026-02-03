import {Controller, Get} from '@nestjs/common';

interface IHealthController {
    status: string;
    timestamp: string;
    version: string;
}

@Controller()
export class HealthController {
    @Get('health')
    public health(): IHealthController {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        };
    }
}
