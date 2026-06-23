import { Injectable } from '@nestjs/common';

/**
 * Mutex applicatif par ressource.
 *
 * Garantit qu'une seule opération critique s'exécute à la fois
 * pour une ressource donnée (roomId) sur la même instance Node.js.
 *
 * Principe : chaîne de Promises par clé.
 * Chaque acquéreur attend la fin du précédent avant de s'exécuter.
 */
@Injectable()
export class ResourceMutex {
  private readonly locks = new Map<string, Promise<void>>();

  async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();

    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    this.locks.set(
      key,
      previous.then(() => current),
    );

    try {
      await previous;
      return await fn();
    } finally {
      release();
      if (this.locks.get(key) === current) {
        this.locks.delete(key);
      }
    }
  }
}
