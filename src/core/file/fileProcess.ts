import path from 'node:path';
import { Piscina } from 'piscina';
import { fileURLToPath } from 'url';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { getWorkerThreadCount } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile, RawFile } from './fileTypes.js';

// Worker pool singleton
let workerPool: Piscina | null = null;

const initializeWorkerPool = (numOfTasks: number): Piscina => {
  if (workerPool) {
    return workerPool;
  }

  const { minThreads, maxThreads } = getWorkerThreadCount(numOfTasks);
  logger.trace(`Initializing worker pool with min=${minThreads}, max=${maxThreads} threads`);

  workerPool = new Piscina({
    filename: path.resolve(path.dirname(fileURLToPath(import.meta.url)), './workers/fileProcessWorker.js'),
    minThreads,
    maxThreads,
    idleTimeout: 5000,
  });

  return workerPool;
};

export const processFiles = async (
  rawFiles: RawFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
): Promise<ProcessedFile[]> => {
  const pool = initializeWorkerPool(rawFiles.length);
  const tasks = rawFiles.map((rawFile, index) => ({
    rawFile,
    index,
    totalFiles: rawFiles.length,
    config,
  }));

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting file processing for ${rawFiles.length} files using worker pool`);

    let completedTasks = 0;
    const totalTasks = tasks.length;

    const results = await Promise.all(
      tasks.map(task =>
        pool.run(task).then(result => {
          completedTasks++;
          progressCallback(`Processing file... (${completedTasks}/${totalTasks}) ${pc.dim(task.rawFile.path)}`);
          return result;
        })
      )
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`File processing completed in ${duration.toFixed(2)}ms`);

    return results;
  } catch (error) {
    logger.error('Error during file processing:', error);
    throw error;
  }
};

export const cleanupWorkerPool = async (): Promise<void> => {
  if (workerPool) {
    logger.trace('Cleaning up file process worker pool');
    await workerPool.destroy();
    workerPool = null;
  }
};
