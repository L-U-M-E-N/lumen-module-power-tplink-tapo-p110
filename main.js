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

console.log(config);

(async() => {
	console.log('Loading power data ...');

	const start = new Date(Date.now());
	start.setHours(0);
	start.setMinutes(0);
	start.setSeconds(0);
	start.setMilliseconds(0);

	const end = new Date(start.getTime());
	end.setHours(12);

	console.log(start.getTime() / 1000);
	console.log(end.getTime() / 1000);

	for(const ip of ips) {
		console.log('Loading power data ...', ip);

		await new Promise((resolve, reject) => {
			// Yeaaap, this is ugly, but I tried to rewrite python module as JS Code, and failed, so, let's get lazy
			const pythonProcess = child_process.spawn('python', [__dirname + '/getData.py', ip, username, password, start.getTime() / 1000, end.getTime() / 1000]);
			pythonProcess.stdout.on('data', (data) => {
				//console.log(data.toString());

				const results = data.toString().replaceAll('\'', '"').replace('\r', '').split('\n');

				const genericData = JSON.parse(results[0]);

				const hourly = JSON.parse(results[3]);
				const daily = JSON.parse(results[2]);
				daily.result.data = daily.result.data.slice(0, 29);
				const monthly = JSON.parse(results[1]);
				monthly.result.data = monthly.result.data.filter(x => x !== 0);

				// Reformat
				const reformattedData = {
					result: {
						today_runtime: genericData.result.today_runtime,
						month_runtime: genericData.result.month_runtime,
						today_energy: genericData.result.today_energy,
						month_energy: genericData.result.month_energy,
						local_time: genericData.result.local_time,
						current_power: genericData.result.current_power,
						past24h: hourly.result.data,
						past30d: daily.result.data,
						past1y: monthly.result.data,
						past7d: [],
					},
					error_code: genericData.error_code + hourly.error_code + daily.error_code + monthly.error_code,
				};

				//console.log(reformattedData);

				AppDataManager.saveObject(
					'power-tplink-tapo-p110',
					`${ip}--${Date.now()}`,
					reformattedData);

				resolve();
			});

			pythonProcess.stderr.on('data', (data) => {
				console.error(data.toString());
			});
		});
	}

	console.log('Loaded power data !')
})();

