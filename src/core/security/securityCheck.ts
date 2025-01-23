import path from 'node:path';
import { Piscina } from 'piscina';
import { fileURLToPath } from 'url';
import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import { getProcessConcurrency, getWorkerThreadCount } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
}

// Worker pool singleton
let workerPool: Piscina | null = null;

/**
 * Initialize the worker pool
 */
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

/**
 * Cleanup worker pool resources
 */
export const cleanupWorkerPool = async (): Promise<void> => {
  if (workerPool) {
    logger.trace('Cleaning up security check worker pool');
    await workerPool.destroy();
    workerPool = null;
  }
};

/**
 * Process files in chunks to maintain progress visibility
 */
async function processFileChunks(
  pool: Piscina,
  tasks: Array<{ filePath: string; content: string }>,
  progressCallback: RepomixProgressCallback,
  chunkSize = 100
): Promise<SuspiciousFileResult[]> {
  const results: SuspiciousFileResult[] = [];
  let completedTasks = 0;
  const totalTasks = tasks.length;

  // Process files in chunks
  for (let i = 0; i < tasks.length; i += chunkSize) {
    const chunk = tasks.slice(i, i + chunkSize);
    const chunkPromises = chunk.map(task => {
      return pool.run(task).then(result => {
        completedTasks++;
        const percent = ((completedTasks / totalTasks) * 100).toFixed(1);
        progressCallback(
          `Running security check... (${completedTasks}/${totalTasks}) ${pc.dim(task.filePath)}`
        );
        return result;
      });
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults.filter((result): result is SuspiciousFileResult => result !== null));

    // Allow event loop to process other tasks
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
}

/**
 * Run security checks on multiple files in parallel using worker threads
 */
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

    // Process files in chunks
    const results = await processFileChunks(pool, tasks, progressCallback);

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Security check completed in ${duration.toFixed(2)}ms`);

    return results;
  } catch (error) {
    logger.error('Error during security check:', error);
    throw error;
  }
};
