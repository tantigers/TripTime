/** @format */

import axios from 'axios';

export default axios.create({
  baseURL: `${process.env.API_HOSTNAME}/api`,
  withCredentials: true,
  responseType: 'json',
});