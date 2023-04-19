import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

@Injectable()
export class HttpAxiosService {
  constructor(private readonly httpService: HttpService) {}
  postNode(endpoint: string, data: any): Promise<AxiosResponse> {
    return axios.post(`http://162.214.164.60:8082/${endpoint}`, data, {
      headers: {
        Authorization:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVG9kb3MiLCJpZCI6MjksImlhdCI6MTY2Mzg4ODg2NSwiZXhwIjoxNjYzODg4ODY4fQ.gDR4G_sB7dfd9jZEf6e0kfgzU0uMxdfB6gajRNINmAw',
      },
    });
  }
  postMicrosip(endpoint: string, data: any): Promise<AxiosResponse> {
    return axios.post(`http://localhost:8080/${endpoint}`, data);
  }
}
