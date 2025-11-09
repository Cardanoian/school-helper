import { promises as fs } from 'node:fs';
import path from 'node:path';

const LOG_DIRECTORY = path.join(process.cwd(), 'logs');

let directoryReady = false;

const getKstTimestamp = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');

  return `${year}${month}${day}_${hour}${minute}${second}`;
};

const ensureDirectory = async () => {
  if (directoryReady) {
    return;
  }

  await fs.mkdir(LOG_DIRECTORY, { recursive: true });
  directoryReady = true;
};

export const writeWeatherLog = async (data: unknown, prefix = 'weather') => {
  try {
    await ensureDirectory();
    const timestamp = getKstTimestamp();
    const filename = `${prefix}-${timestamp}.json`;
    const filepath = path.join(LOG_DIRECTORY, filename);
    const payload =
      typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    await fs.writeFile(filepath, payload, 'utf-8');
  } catch (error) {
    console.warn('Failed to write weather log', error);
  }
};

export const getLogDirectory = () => LOG_DIRECTORY;
