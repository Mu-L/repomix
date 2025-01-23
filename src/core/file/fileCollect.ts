import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Piscina } from 'piscina';
import { logger } from '../../shared/logger.js';
import { getWorkerThreadCount } from '../../shared/processConcurrency.js';
import type { RawFile } from './fileTypes.js';
import { RepomixProgressCallback } from '../../shared/types.js';
import pc from 'picocolors';

// Worker pool singleton
let workerPool: Piscina | null = null;

const initializeWorkerPool = (numOfTasks: number): Piscina => {
  if (workerPool) {
    return workerPool;
  }

  const { minThreads, maxThreads } = getWorkerThreadCount(numOfTasks);
  logger.trace(`Initializing worker pool with min=${minThreads}, max=${maxThreads} threads`);

  workerPool = new Piscina({
    filename: path.resolve(path.dirname(fileURLToPath(import.meta.url)), './workers/fileCollectWorker.js'),
    minThreads,
    maxThreads,
    idleTimeout: 5000
  });

  return workerPool;
};

export const collectFiles = async (
  filePaths: string[],
  rootDir: string,
  progressCallback: RepomixProgressCallback,
): Promise<RawFile[]> => {
  const pool = initializeWorkerPool(filePaths.length);
  const tasks = filePaths.map((filePath) => ({
    filePath,
    rootDir,
  }));

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting file collection for ${filePaths.length} files using worker pool`);

    let completedTasks = 0;
    const totalTasks = tasks.length;

    const results = await Promise.all(
      tasks.map((task) =>
        pool.run(task).then((result) => {
          completedTasks++;
          progressCallback(`Collect file... (${completedTasks}/${totalTasks}) ${pc.dim(task.filePath)}`);
          logger.trace(`Collect files... (${completedTasks}/${totalTasks}) ${task.filePath}`);
          return result;
        })
      )
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`File collection completed in ${duration.toFixed(2)}ms`);

    return results.filter((file): file is RawFile => file !== null);
  } catch (error) {
    logger.error('Error during file collection:', error);
    throw error;
  }
};

export const cleanupWorkerPool = async (): Promise<void> => {
  if (workerPool) {
    logger.trace('Cleaning up worker pool');
    await workerPool.destroy();
    workerPool = null;
  }
};
