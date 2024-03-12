export class ServiceLocator {
    static async register(key, instance) {
        this.instances.set(key, instance);
    }
    static resolve(key) {
        return this.instances.get(key);
    }
}
ServiceLocator.instances = new Map();
//# sourceMappingURL=serviceLocator.js.map