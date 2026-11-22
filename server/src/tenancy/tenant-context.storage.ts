import { AsyncLocalStorage } from 'async_hooks';
import { TenantContext } from './tenant-context.interface';

const asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

export class TenantContextStorage {
  static run<R>(context: TenantContext, callback: () => R): R {
    return asyncLocalStorage.run(context, callback);
  }

  static get(): TenantContext | undefined {
    return asyncLocalStorage.getStore();
  }

  static getTenantId(): string | undefined {
    return asyncLocalStorage.getStore()?.tenantId;
  }

  static getPropertyId(): string | undefined {
    return asyncLocalStorage.getStore()?.propertyId;
  }
}
