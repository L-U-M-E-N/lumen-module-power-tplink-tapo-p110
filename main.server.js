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
			for(const fileName of (await readdir(config['dataFolder']))) {
				if(fileList.map((x) => x.name).includes(fileName)) {
					continue;
				}

				log('Loading file ...' + fileName);

				const content = await readFile(path.join(config['dataFolder'], fileName));
				const parsedContent = JSON.parse(content);

				try {
					await Database.execQuery('BEGIN TRANSACTION');

					// Save file to db
					const [fileQuery, fileValues] = Database.buildInsertQuery('power_files_history', {
						name: fileName,
						content
					});
					await Database.execQuery(fileQuery, fileValues);

					// Save data to db
					const date = new Date(parsedContent.from);
					if(fileName.includes('-hourly-')) {
						await TpLinkP110PowerStatsSubmitter.pushData(
							parsedContent.data,
							date,
							'hourly',
							(currDate) => {
								currDate.setHours(currDate.getHours() + 1);
								return currDate
							}, {
								ip: fileName.split('-')[0],
								source: fileName,
								type: 'hourly'
							}
						);
					} else if(fileName.includes('-daily-')) {
						await TpLinkP110PowerStatsSubmitter.pushData(
							parsedContent.data,
							date,
							'daily',
							(currDate) => {
								currDate.setDate(currDate.getDate() + 1);
								return currDate
							}, {
								ip: fileName.split('-')[0],
								source: fileName,
								type: 'daily'
							}
						);
					} else if(fileName.includes('-monthly-')) {
						await TpLinkP110PowerStatsSubmitter.pushData(
							parsedContent.data,
							date,
							'monthly',
							(currDate) => {
								currDate.setMonth(currDate.getMonth() + 1);
								return currDate
							}, {
								ip: fileName.split('-')[0],
								source: fileName,
								type: 'monthly'
							}
						);
					}

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
