import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import fetch from 'node-fetch';

@Injectable()
export class HttpAxiosService {
  constructor(private readonly httpService: HttpService) {}
  async postNode(endpoint: string, data: any): Promise<any> {
    let COTIFAST_API_URL: string;

    //VALIDAMOS LAS VARIABLES DE ENTORNO DEL ENV
    COTIFAST_API_URL =
      process.env.ENVIRONMENT == 'produccion'
        ? process.env.COTIFAST_API_URL_PROD
        : process.env.COTIFAST_API_URL_DEV;

    console.log(
      'Connecting to API BackEnd Cotifast...ENVIRONMENT: ' +
        process.env.ENVIRONMENT +
        ' URL: ' +
        COTIFAST_API_URL,
    );

    const response = await fetch(COTIFAST_API_URL + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.COTIFAST_API_AUTH,
      },
      body: JSON.stringify(data),
    });
    //console.log(response.json())
    return await response.json();
    /*    return axios.post(COTIFAST_API_URL+endpoint, data, {
      headers: {
        Authorization: process.env.COTIFAST_API_AUTH
      },
    }); */
  }

  postMicrosip(endpoint: string, data: any): Promise<AxiosResponse> {
    let MICROSIP_API_URL: string;

    //VALIDAMOS LAS VARIABLES DE ENTORNO DEL ENV
    MICROSIP_API_URL =
      process.env.ENVIRONMENT == 'produccion'
        ? process.env.MICROSIP_API_URL_PROD
        : process.env.MICROSIP_API_URL_DEV;

    //console.log("Connecting to API Microsip...ENVIRONMENT: "+process.env.ENVIRONMENT+ " URL: "+MICROSIP_API_URL)

    return axios.post(MICROSIP_API_URL + endpoint, data);
  }
}
