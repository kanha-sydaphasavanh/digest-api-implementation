import CryptoJS from 'crypto-js';
import XMLHttpRequest from 'xhr2';
import { Constants } from './util/Constants.js';

export default class DigestAuthRequest {
    constructor(method, url, username, password) {
        this.scheme = null;
        this.nonce = null;
        this.realm = null;
        this.qop = null;
        this.response = null;
        this.opaque = null;
        this.nc = 1;
        this.cnonce = null;

        this.timeout = 10000;
        this.loggingOn = true;

        this.post = false;
        if (method.toLowerCase() === 'post' || method.toLowerCase() === 'put') {
            this.post = true;
        }

        this.request = (successFn, errorFn, data) => {
            if (data) {
                this.data = JSON.stringify(data);
            }
            this.successFn = successFn;
            this.errorFn = errorFn;

            if (!this.nonce) {
                this.makeUnauthenticatedRequest(this.data);
            } else {
                this.makeAuthenticatedRequest();
            }
        };

        this.makeUnauthenticatedRequest = (data) => {
            this.firstRequest = new XMLHttpRequest();
            this.firstRequest.open(method, url, true);
            this.firstRequest.timeout = this.timeout;

            if (this.post) {
                this.firstRequest.setRequestHeader('Content-type', 'application/json');
            }

            this.firstRequest.onreadystatechange = () => {
                if (this.firstRequest.readyState === 2) {
                    const responseHeaders = this.firstRequest.getAllResponseHeaders();
                    const headers = responseHeaders.split('\n');
                    let digestHeaders;

                    for (let i = 0; i < headers.length; i++) {
                        if (headers[i].match(/www-authenticate/i) != null) {
                            digestHeaders = headers[i];
                        }
                    }

                    if (digestHeaders != null) {
                        digestHeaders = digestHeaders.slice(digestHeaders.indexOf(':') + 1, -1);
                        digestHeaders = digestHeaders.split(',');
                        this.scheme = digestHeaders[0].split(/\s/)[1];

                        for (let i = 0; i < digestHeaders.length; i++) {
                            const equalIndex = digestHeaders[i].indexOf('=');
                            const key = digestHeaders[i].substring(0, equalIndex);
                            let val = digestHeaders[i].substring(equalIndex + 1);
                            val = val.replace(/['"]+/g, '');

                            if (key.match(/realm/i) != null) {
                                this.realm = val;
                            }
                            if (key.match(/nonce/i) != null) {
                                this.nonce = val;
                            }
                            if (key.match(/opaque/i) != null) {
                                this.opaque = val;
                            }
                            if (key.match(/qop/i) != null) {
                                this.qop = val;
                            }
                        }

                        this.cnonce = this.generateCnonce();
                        this.nc++;

                        this.makeAuthenticatedRequest();
                    }
                }
                if (this.firstRequest.readyState === 4) {
                    if (this.firstRequest.status === 200) {
                        console.log('Authentication not required for ' + url);
                        if (this.firstRequest.responseText !== 'undefined') {
                            if (this.firstRequest.responseText.length > 0) {
                                if (this.isJson(this.firstRequest.responseText)) {
                                    this.successFn(JSON.parse(this.firstRequest.responseText));
                                } else {
                                    this.successFn(this.firstRequest.responseText);
                                }
                            }
                        } else {
                            this.successFn();
                        }
                    }
                }
            };

            if (this.post) {
                this.firstRequest.send(this.data);
            } else {
                this.firstRequest.send();
            }
            this.log('Unauthenticated request to ' + url);

            this.firstRequest.onerror = () => {
                if (this.firstRequest.status !== 401) {
                    this.log('Error (' + this.firstRequest.status + ') on unauthenticated request to ' + url);
                    this.errorFn(this.firstRequest.status);
                }
            };
        };

        this.makeAuthenticatedRequest = () => {
            this.response = this.formulateResponse();
            this.authenticatedRequest = new XMLHttpRequest();
            this.authenticatedRequest.open(method, url, true);
            this.authenticatedRequest.timeout = this.timeout;
            const digestAuthHeader = `${this.scheme} ` +
                `username="${username}", ` +
                `realm="${this.realm}", ` +
                `nonce="${this.nonce}", ` +
                `uri="${url}", ` +
                `response="${this.response}", ` +
                `opaque="${this.opaque}", ` +
                `qop=${this.qop}, ` +
                `nc=${('00000000' + this.nc).slice(-8)}, ` +
                `cnonce="${this.cnonce}"`;
            this.authenticatedRequest.setRequestHeader('Authorization', digestAuthHeader);
            this.authenticatedRequest.setRequestHeader('Accept', 'application/json');
            this.log('digest auth header response to be sent:');
            this.log(digestAuthHeader);

            if (this.post) {
                this.authenticatedRequest.setRequestHeader('Content-type', 'application/json');
            }

            this.authenticatedRequest.onload = () => {
                if (this.authenticatedRequest.status >= 200 && this.authenticatedRequest.status < 400) {
                    this.nc++;

                    if (this.authenticatedRequest.responseText !== 'undefined' && this.authenticatedRequest.responseText.length > 0) {
                        if (this.isJson(this.authenticatedRequest.responseText)) {
                            this.successFn(JSON.parse(this.authenticatedRequest.responseText));
                        } else {
                            this.successFn(this.authenticatedRequest.responseText);
                        }
                    } else {
                        this.successFn();
                    }
                } else {
                    this.nonce = null;
                    this.errorFn(this.authenticatedRequest);
                }
            };

            this.authenticatedRequest.onerror = () => {
                this.log('Error (' + this.authenticatedRequest.status + ') on authenticated request to ' + url);
                this.nonce = null;
                this.errorFn(this.authenticatedRequest.status);
            };

            if (this.post) {
                this.authenticatedRequest.send(this.data);
            } else {
                this.authenticatedRequest.send();
            }
            this.log('Authenticated request to ' + url);
        };

        this.formulateResponse = () => {
            const HA1 = CryptoJS.MD5(username + ':' + this.realm + ':' + password).toString();
            const HA2 = CryptoJS.MD5(method + ':' + url).toString();
            const response = CryptoJS.MD5(HA1 + ':' +
                this.nonce + ':' +
                ('00000000' + this.nc).slice(-8) + ':' +
                this.cnonce + ':' +
                this.qop + ':' +
                HA2).toString();
            return response;
        };

        this.generateCnonce = () => {
            const characters = 'abcdef0123456789';
            let token = '';
            for (let i = 0; i < 16; i++) {
                const randNum = Math.floor(Math.random() * characters.length);
                token += characters.substring(randNum, randNum + 1);
            }
            return token;
        };

        this.abort = () => {
            this.log('[digestAuthRequest] Aborted request to ' + url);
            if (this.firstRequest != null) {
                if (this.firstRequest.readyState != 4) this.firstRequest.abort();
            }
            if (this.authenticatedRequest != null) {
                if (this.authenticatedRequest.readyState != 4) this.authenticatedRequest.abort();
            }
        }; this.isJson = (str) => {
            try {
                JSON.parse(str);
            } catch (e) {
                return false;
            }
            return true;
        };

        this.log = (str) => {
            if (this.loggingOn) {
                console.log('[digestAuthRequest] ' + str);
            }
        };

        this.version = () => '0.9.0';
    }
}

const constants = new Constants();
const params = new URLSearchParams();
params.append("cwUser", constants.params.CWUSER);
params.append("dataSource", constants.params.DATASOURCE);
params.append("filterOperator", constants.operators.SUBQUERY);
params.append("filterOperand1", "IN (SELECT WOWO_CODE FROM WORK_ORDER WHERE ROWNUM < 5)");

let digestAuthRequest = new DigestAuthRequest(constants.methods.GET, `${constants.baseUrl}/workorders?${params}`, constants.credentials.USERNAME, constants.credentials.PASSWORD);
digestAuthRequest.request((data) => {
    console.log(data);
}, (err) => {
    console.error(err);
})