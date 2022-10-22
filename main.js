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

	for(const ip of ips) {
		console.log('Loading power data ...', ip);

		await new Promise((resolve, reject) => {
			// Yeaaap, this is ugly, but I tried to rewrite python module as JS Code, and failed, so, let's get lazy
			const pythonProcess = child_process.spawn('python', [__dirname + '/getData.py', ip, username, password]);
			pythonProcess.stdout.on('data', (data) => {
				//console.log(data.toString());

				AppDataManager.saveObject(
					'power-tplink-tapo-p110',
					`${ip}--${Date.now()}`,
					data.toString().replaceAll('\'', '"'));

				resolve();
			});

			pythonProcess.stderr.on('data', (data) => {
				console.error(data.toString());
			});
		});
	}

	console.log('Loaded power data !')
})();

