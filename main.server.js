import { readdir, readFile } from 'node:fs/promises';
import path from 'path';

export default class TpLinkP110PowerStatsSubmitter {
	static init() {
		TpLinkP110PowerStatsSubmitter.update();

		clearInterval(TpLinkP110PowerStatsSubmitter.interval);
		TpLinkP110PowerStatsSubmitter.interval = setInterval(TpLinkP110PowerStatsSubmitter.update, 6 * 60 * 60 * 1000); // Update every 6 hour
	}

	static close() {
		clearInterval(TpLinkP110PowerStatsSubmitter.interval);
	}

	static async pushData(list, date, type, incrementDateFn, additionalData) {
		for(const value of list) {
			const [dataQuery, dataValues] = Database.buildInsertQuery('power_history_' + type, {
				date: date,
				value,
				...additionalData
			});

			await Database.execQuery(
				dataQuery,
				dataValues
			);

			date = incrementDateFn(date);
		}
	}

	static async update() {
		try {
			log('Saving power status', 'info');

			const fileList = (await Database.execQuery('SELECT name FROM power_files_history')).rows;
			for(const file of (await readdir(config['dataFolder']))) {
				if(fileList.map((x) => x.name).includes(file)) {
					continue;
				}

				log('Loading file ...' + file);

				const content = await readFile(path.join(config['dataFolder'], file));
				const parsedContent = JSON.parse(content);

				if(parsedContent.error_code !== 0) {
					log('non-zero error code', 'warn');
					continue;
				}

				try {
					await Database.execQuery('BEGIN TRANSACTION');

					// Save file to db
					const [fileQuery, fileValues] = Database.buildInsertQuery('power_files_history', {
						name: file,
						content
					});

					await Database.execQuery(
						fileQuery,
						fileValues
					);

					// Save data to db
					const fileDate = new Date(Date.parse(parsedContent.result.local_time, { setZone: true, zone: 'Europe/Paris' }));

					//// PAST 24h
					// Remove first element as it's probably an unfinished hour
					let date = new Date(fileDate);
					const past24Data = parsedContent.result.past24h.reverse();
					past24Data.shift();
					date.setHours(date.getHours() - 1);

					await TpLinkP110PowerStatsSubmitter.pushData(
						past24Data,
						date,
						'hourly',
						(currDate) => {
							currDate.setHours(currDate.getHours() - 1);
							return currDate
						}, {
							ip: file.split('--')[0],
							source: file,
							type: 'past24h'
						}
					);

					//// PAST 30d
					const past30dData = parsedContent.result.past30d.reverse();
					// Remove first element as it's probably an unfinished day
					past30dData.shift();
					date = new Date(fileDate);
					date.setDate(date.getDate() - 1);

					await TpLinkP110PowerStatsSubmitter.pushData(
						past30dData,
						date,
						'daily',
						(currDate) => {
							currDate.setDate(currDate.getDate() - 1);
							return currDate
						}, {
							ip: file.split('--')[0],
							source: file,
							type: 'past30d'
						}
					);

					//// PAST 1y
					const past1yData = parsedContent.result.past1y.reverse();
					// Remove first element as it's probably an unfinished day
					past1yData.shift();
					date = new Date(fileDate);
					date.setMonth(date.getMonth() - 1);

					await TpLinkP110PowerStatsSubmitter.pushData(
						past1yData,
						date,
						'monthly',
						(currDate) => {
							currDate.setMonth(currDate.getMonth() - 1);
							return currDate
						}, {
							ip: file.split('--')[0],
							source: file,
							type: 'past1y'
						}
					);

					await Database.execQuery('COMMIT');
				} catch(e) {
					console.error(e);
					await Database.execQuery('ROLLBACK');
				}
			}
			

			log('Saved power status', 'info');
		} catch(e) {
			console.error(e);
		}
	}
}
