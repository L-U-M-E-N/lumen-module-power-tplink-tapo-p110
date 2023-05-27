import child_process from 'child_process';
import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const config = ConfigManager.get('power-tplink-tapo-p110', 'credentials');
const ips = config.ips;
const username = config.username;
const password = config.password;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIN_TO_MS = 60_000;
const INTERVAL_HOURLY = 60;
const INTERVAL_DAILY = INTERVAL_HOURLY * 24;
const INTERVAL_MONTHLY = INTERVAL_DAILY * 30;

/***
 * Notes about the following code:
 * - I tried to rewrite python package in Javascript, but it's clearly a mess to write + node's fetch 
 * doesn't act right because of Connection header that *must* be set to keep-alive (which is not really
 * allowed by HTTP spec. I only succeed to make work initial handshake with browsers' fetch. I might
 * retry in the future. But now, here's a working temporary solution. I might need to manage TCP connection
 * myself to bypass all of these weirdness ...
 * - Timestamp usage from P110 API is really chaotic:
 * 		- Hours are completly ignored, it always start at midnight of the timestamp_start
 *      - When querying daily data, initial date is ignored, it uses 1st of the specified month
 *      - When querying monthly data, initial date is ignored as well, it uses January of the specified year
 *      - Timestamp end is often ignored, which is why I slice date myself for daily/monthly files
 * 
 * RIP my brain after debugging this mess ...
 */

async function getData(ip, start, end, interval) {
	const pythonProcess = child_process.spawn('python', [
		__dirname + '/getData.py',
		ip,
		username,
		password,
		start.getTime() / 1000,
		end.getTime() / 1000,
		interval,
	]);

	pythonProcess.stderr.on('data', (data) => {
		console.error(data.toString());
	});

	return new Promise((resolve, reject) => {
		pythonProcess.stdout.on('data', (data) => {
			resolve(JSON.parse(data.toString().replaceAll('\'', '"')));
		});
	});
}

(async() => {
	console.log('Loading power data ...');

	const latestMidnight = new Date(Date.now());
	latestMidnight.setHours(0);
	latestMidnight.setMinutes(0);
	latestMidnight.setSeconds(0);
	latestMidnight.setMilliseconds(0);

	
	for(const ip of ips) {
		console.log('Loading power data ...', ip);

		///////////////////////////////////
		//// Hourly data
		const pastMidnight = new Date(latestMidnight.getTime() - (INTERVAL_DAILY * MIN_TO_MS));
		const hourly = await getData(ip, pastMidnight, latestMidnight, INTERVAL_HOURLY);

		// Save to ip-hourly-from-to.json
		await AppDataManager.saveObject(
			'power-tplink-tapo-p110',
			`${ip}-hourly-${pastMidnight.getTime()}-${latestMidnight.getTime()}`, {
			from: pastMidnight.getTime(),
			to: latestMidnight.getTime(),
			interval: INTERVAL_HOURLY,
			data: hourly.result.data
		});

		///////////////////////////////////
		//// Daily data
		const firstOfMonthMidnight = new Date(latestMidnight.getTime());
		firstOfMonthMidnight.setDate(1);
		const daily = await getData(ip, firstOfMonthMidnight, latestMidnight, INTERVAL_DAILY);
		daily.result.start_timestamp_eq_date = new Date(daily.result.start_timestamp * 1000);
		daily.result.end_timestamp_eq_date = new Date(daily.result.end_timestamp * 1000);


		// Save to ip-daily-from-to.json
		await AppDataManager.saveObject(
			'power-tplink-tapo-p110',
			`${ip}-daily-${firstOfMonthMidnight.getTime()}-${latestMidnight.getTime()}`, {
			from: firstOfMonthMidnight.getTime(),
			to: latestMidnight.getTime(),
			interval: INTERVAL_DAILY,
			data: daily.result.data.slice(0, (latestMidnight.getTime() - firstOfMonthMidnight.getTime()) / (INTERVAL_DAILY * MIN_TO_MS))
		});

		///////////////////////////////////
		//// Monthly data
		const firstOfYearMidnight = new Date(latestMidnight.getTime());
		firstOfYearMidnight.setDate(1);
		firstOfYearMidnight.setMonth(0);
		const monthly = await getData(ip, firstOfYearMidnight, latestMidnight, INTERVAL_MONTHLY);
		monthly.result.start_timestamp_eq_date = new Date(monthly.result.start_timestamp * 1000);
		monthly.result.end_timestamp_eq_date = new Date(monthly.result.end_timestamp * 1000);


		// Save to ip-monthly-from-to.json
		await AppDataManager.saveObject(
			'power-tplink-tapo-p110',
			`${ip}-monthly-${firstOfYearMidnight.getTime()}-${latestMidnight.getTime()}`, {
			from: firstOfYearMidnight.getTime(),
			to: latestMidnight.getTime(),
			interval: INTERVAL_MONTHLY,
			data: monthly.result.data.slice(0, (latestMidnight.getTime() - firstOfYearMidnight.getTime()) / (INTERVAL_MONTHLY * MIN_TO_MS))
		});
	}

	console.log('Loaded power data !')
})();