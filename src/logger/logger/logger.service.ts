import { Injectable } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class LoggerService {
  config = {
    levels: {
      error: 0,
      debug: 1,
      warn: 2,
      data: 3,
      info: 4,
      verbose: 5,
      silly: 6,
    },
    colors: {
      error: 'red',
      debug: 'blue',
      warn: 'yellow',
      data: 'magenta',
      info: 'green',
      verbose: 'cyan',
      silly: 'grey',
    },
  };
  wLogger = (input: { logName: string; level: string }): winston.Logger => {
    winston.addColors(this.config.colors);
    return winston.createLogger({
      levels: this.config.levels,
      level: `${input.level}`,
      transports: [
        new winston.transports.Console({
          level: `${input.level}`,

          format: winston.format.combine(
            winston.format.printf(
              (info) =>
                // https://stackoverflow.com/a/69044670/20358783 more detailLocaleString
                `${new Date().toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Chihuahua',
                })} ${info.level.toLocaleUpperCase()}: ${info.message}`,
            ),
            winston.format.colorize({ all: true }),
          ),
        }),
        new winston.transports.File({
          filename: `./src/logs/${input.logName}/${input.logName}-Error.log`,
          level: 'error',
          format: winston.format.combine(
            winston.format.printf(
              (info) =>
                `${new Date().toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Chihuahua',
                })} ${info.level.toLocaleUpperCase()}: ${info.message}`,
            ),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: `./src/logs/${input.logName}/${input.logName}-Warn.log`,
          level: 'warn',
          format: winston.format.printf(
            (info) =>
              `${new Date().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Chihuahua',
              })} ${info.level.toLocaleUpperCase()}: ${info.message}`,
          ),
        }),
        new winston.transports.File({
          filename: `./src/logs/${input.logName}/${input.logName}-All.log`,
          level: 'silly',
          format: winston.format.printf(
            (info) =>
              `${new Date().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Chihuahua',
              })} ${info.level.toLocaleUpperCase()}: ${info.message}`,
          ),
        }),

        new winston.transports.File({
          format: winston.format.printf(
            (info) =>
              `${new Date().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Chihuahua',
              })} ${info.level.toLocaleUpperCase()}: ${info.message}`,
          ),
          filename: './src/logs/globalLog.log',
          level: 'silly',
        }),
      ],
    });
  };
}
