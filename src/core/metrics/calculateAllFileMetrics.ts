import path from 'node:path';
import { Piscina } from 'piscina';
import { fileURLToPath } from 'url';
import pc from 'picocolors';
import type { TiktokenEncoding } from 'tiktoken';
import { logger } from '../../shared/logger.js';
import { getWorkerThreadCount } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { FileMetrics } from './workers/types.js';

// Worker pool singleton
let workerPool: Piscina | null = null;

/**
 * Initialize the worker pool
 */
const initializeWorkerPool = (numOfTasks: number): Piscina => {
  if (workerPool) {
    return workerPool;
  }

  const { minThreads, maxThreads } = getWorkerThreadCount( numOfTasks);
  logger.trace(`Initializing worker pool with min=${minThreads}, max=${maxThreads} threads`);

  workerPool = new Piscina({
    filename: path.resolve(path.dirname(fileURLToPath(import.meta.url)), './workers/fileMetricsWorker.js'),
    minThreads,
    maxThreads,
    idleTimeout: 5000
  });

  return workerPool;
};

/**
 * Calculate metrics for all files using a worker thread pool
 */
export const calculateAllFileMetrics = async (
  processedFiles: ProcessedFile[],
  tokenCounterEncoding: TiktokenEncoding,
  progressCallback: RepomixProgressCallback,
): Promise<FileMetrics[]> => {
  const pool = initializeWorkerPool(processedFiles.length);
  const tasks = processedFiles.map((file, index) => ({
    file,
    index,
    totalFiles: processedFiles.length,
    encoding: tokenCounterEncoding,
  }));

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting metrics calculation for ${processedFiles.length} files using worker pool`);

    const results = await Promise.all(
      tasks.map(task => pool.run(task).then(result => {
        progressCallback(`Calculating metrics... (${task.index + 1}/${task.totalFiles}) ${pc.dim(task.file.path)}`);
        return result;
      }))
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Metrics calculation completed in ${duration.toFixed(2)}ms`);

    return results;
  } catch (error) {
    logger.error('Error during metrics calculation:', error);
    throw error;
  }
};

/**
 * Cleanup worker pool resources
 */
export const cleanupWorkerPool = async (): Promise<void> => {
  if (workerPool) {
    logger.trace('Cleaning up metrics worker pool');
    await workerPool.destroy();
    workerPool = null;
  }
};
