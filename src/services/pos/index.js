import * as petpoojaService from './petpooja.service.js';
import * as posistService from './posist.service.js';

const services = {
    'PETPOOJA': petpoojaService,
    'POSIST': posistService
};

export const getPosService = (provider) => {
    return services[provider];
};
