import path from 'node:path';
import { Piscina } from 'piscina';
import { fileURLToPath } from 'url';
import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import { getWorkerThreadCount } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
}

// Worker pool singleton
let workerPool: Piscina | null = null;

const initializeWorkerPool = (numOfTasks: number): Piscina => {
  if (workerPool) {
    return workerPool;
  }

  const { minThreads, maxThreads } = getWorkerThreadCount(numOfTasks);
  logger.trace(`Initializing worker pool with min=${minThreads}, max=${maxThreads} threads`);

  workerPool = new Piscina({
    filename: path.resolve(path.dirname(fileURLToPath(import.meta.url)), './workers/securityCheckWorker.js'),
    minThreads,
    maxThreads,
    idleTimeout: 5000,
  });

  return workerPool;
};

export const cleanupWorkerPool = async (): Promise<void> => {
  if (workerPool) {
    logger.trace('Cleaning up security check worker pool');
    await workerPool.destroy();
    workerPool = null;
  }
};

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
): Promise<SuspiciousFileResult[]> => {
  const pool = initializeWorkerPool(rawFiles.length);
  const tasks = rawFiles.map(file => ({
    filePath: file.path,
    content: file.content,
  }));

  try {
    logger.trace(`Starting security check for ${tasks.length} files`);
    const startTime = process.hrtime.bigint();

    let completedTasks = 0;
    const totalTasks = tasks.length;

    const results = await Promise.all(
      tasks.map(task =>
        pool.run(task).then(result => {
          completedTasks++;
          progressCallback(
            `Running security check... (${completedTasks}/${totalTasks}) ${pc.dim(task.filePath)}`
          );
          return result;
        })
      )
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Security check completed in ${duration.toFixed(2)}ms`);

    return results.filter((result): result is SuspiciousFileResult => result !== null);
  } catch (error) {
    logger.error('Error during security check:', error);
    throw error;
  }
};
