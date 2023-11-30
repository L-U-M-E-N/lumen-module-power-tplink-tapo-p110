import child_process from 'child_process';
import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const MODULE_NAME = 'power-tplink-tapo-p110';

const config = ConfigManager.get(MODULE_NAME, 'credentials');
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

	let iteratorDate = new Date(Date.now());
	iteratorDate.setHours(0);
	iteratorDate.setMinutes(0);
	iteratorDate.setSeconds(0);
	iteratorDate.setMilliseconds(0);

	for(let i = 0; i < 7; i++) {
		if(i !== 0) {
			iteratorDate = new Date(iteratorDate.getTime() - (INTERVAL_DAILY * MIN_TO_MS));
		}

		console.log(`Loading power data for ${iteratorDate.toISOString()} ...`);
		
		for(const ip of ips) {
			console.log('Loading power data ...', ip);

			const currentDateMidnight = new Date(iteratorDate.getTime());

			///////////////////////////////////
			//// Hourly data
			const pastMidnight = new Date(currentDateMidnight.getTime() - (INTERVAL_DAILY * MIN_TO_MS));
			let fileName = `${ip}-hourly-${pastMidnight.getTime()}-${currentDateMidnight.getTime()}`;

			if(!(await AppDataManager.exists(MODULE_NAME, fileName))) {
				const hourly = await getData(ip, pastMidnight, currentDateMidnight, INTERVAL_HOURLY);

				// Save to ip-hourly-from-to.json
				await AppDataManager.saveObject(
					MODULE_NAME,
					fileName, {
					from: pastMidnight.getTime(),
					to: currentDateMidnight.getTime(),
					interval: INTERVAL_HOURLY,
					data: hourly.data
				});
			}

			///////////////////////////////////
			//// Daily data
			const firstOfMonthMidnight = new Date(currentDateMidnight.getTime());
			firstOfMonthMidnight.setDate(1);
			fileName = `${ip}-daily-${firstOfMonthMidnight.getTime()}-${currentDateMidnight.getTime()}`;

			if(!(await AppDataManager.exists(MODULE_NAME, fileName))) {
				const daily = await getData(ip, firstOfMonthMidnight, currentDateMidnight, INTERVAL_DAILY);
				daily.start_timestamp_eq_date = new Date(daily.start_timestamp * 1000);
				daily.end_timestamp_eq_date = new Date(daily.end_timestamp * 1000);


				// Save to ip-daily-from-to.json
				await AppDataManager.saveObject(
					MODULE_NAME,
					fileName, {
					from: firstOfMonthMidnight.getTime(),
					to: currentDateMidnight.getTime(),
					interval: INTERVAL_DAILY,
					data: daily.data.slice(0, (currentDateMidnight.getTime() - firstOfMonthMidnight.getTime()) / (INTERVAL_DAILY * MIN_TO_MS))
				});
			}

			///////////////////////////////////
			//// Monthly data
			const firstOfYearMidnight = new Date(currentDateMidnight.getTime());
			firstOfYearMidnight.setDate(1);
			firstOfYearMidnight.setMonth(0);
			fileName = `${ip}-monthly-${firstOfYearMidnight.getTime()}-${currentDateMidnight.getTime()}`;

			if(!(await AppDataManager.exists(MODULE_NAME, fileName))) {
				const monthly = await getData(ip, firstOfYearMidnight, currentDateMidnight, INTERVAL_MONTHLY);
				monthly.start_timestamp_eq_date = new Date(monthly.start_timestamp * 1000);
				monthly.end_timestamp_eq_date = new Date(monthly.end_timestamp * 1000);


				// Save to ip-monthly-from-to.json
				await AppDataManager.saveObject(
					MODULE_NAME,
					fileName, {
					from: firstOfYearMidnight.getTime(),
					to: currentDateMidnight.getTime(),
					interval: INTERVAL_MONTHLY,
					data: monthly.data.slice(0, (currentDateMidnight.getTime() - firstOfYearMidnight.getTime()) / (INTERVAL_MONTHLY * MIN_TO_MS))
				});
			}
		}

		console.log('Loaded power data !');
	}
})();
