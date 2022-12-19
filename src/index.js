import * as SignalR from '@microsoft/signalr';
import {LogLevel} from "@microsoft/signalr";

const EventEmitter = require('events');

const defaultOptions = {
    log: false,
};

class SocketConnection extends EventEmitter {
    constructor(connection) {
        super();

        this.connection = connection;
        this.listened = [];
        this.socket = false;

        this.toSend = [];

        this.offline = false;
        this._isMounted = false;
    }

    async _initialize(connection = '') {
        const con = connection || this.connection;
        const logLevel = this.options.log ? LogLevel.Information : LogLevel.None
        try {
            const socket = new SignalR.HubConnectionBuilder()
                .withUrl(con)
                .withAutomaticReconnect()
                .configureLogging(logLevel)
                .build()

            socket.connection.onclose = async (error) => {
                if (this._isMounted) {
                    if (this.options.log) console.log('Reconnecting...');

                    this.socket = false;
                    /* eslint-disable no-underscore-dangle */
                    await this._initialize(con);
                    this.emit('reconnect');
                }
            };

            await socket.start();

            this.socket = socket;
            this._isMounted = true;
            this.emit('init');
        } catch (error) {
            if (this.options.log) console.log('Error, reconnecting...', error);

            setTimeout(() => {
                this._initialize(con);
            }, 1000);
        }
    }

    async start(options = {}) {
        this.options = Object.assign(defaultOptions, options);

        await this._initialize();
    }

    async stop() {
        if (typeof this.socket.stop !== 'function') {
            return
        }
        this._isMounted = false;
        this.emit('destroy');
        await this.socket.stop();
    }

    async authenticate(accessToken, options = {}) {
        this.connection = `${this.connection}?authorization=${accessToken}`;

        /* eslint-disable no-underscore-dangle */
        await this.start(options);
    }

    listen(method) {
        if (this.offline) return;

        if (this.listened.some(v => v === method)) return;
        this.listened.push(method);
        const callback = (data) => {
            if (this.options.log) console.log({type: 'receive', method, data});

            this.emit(method, data);
        };

        this.on('init', () => {
            this.socket.on(method, callback);
        });

        this.on('destroy', () => {
            if (!this.socket) {
                return
            }
            this.socket.off(method);
        });
    }

    send(methodName, ...args) {
        if (this.options.log) console.log({type: 'send', methodName, args});
        if (this.offline) return;

        if (this.socket) {
            this.socket.send(methodName, ...args);
            return;
        }

        this.once('init', () => this.socket.send(methodName, ...args));
    }

    async invoke(methodName, ...args) {
        if (this.options.log) console.log({type: 'invoke', methodName, args});
        if (this.offline) return false;

        if (this.socket) {
            return this.socket.invoke(methodName, ...args);
        }

        return new Promise(async resolve =>
            this.once('init', () =>
                resolve(this.socket.invoke(methodName, ...args))));
    }

}

if (!SignalR) {
    throw new Error('[Vue-SignalR] Cannot locate signalr-client');
}

function install(Vue, connection) {
    if (!connection) {
        throw new Error('[Vue-SignalR] Cannot locate connection');
    }

    const Socket = new SocketConnection(connection);

    Vue.socket = Socket;

    Object.defineProperties(Vue.prototype, {

        $socket: {
            get() {
                return Socket;
            },
        },

    });

    Vue.mixin({

        created() {
            if (this.$socket.socket) {
                return;
            }
            if (this.$options.sockets) {
                const methods = Object.getOwnPropertyNames(this.$options.sockets);

                methods.forEach((method) => {
                    Socket.listen(method);

                    Socket.on(method, data =>
                        this.$options.sockets[method].call(this, data));
                });
            }

            if (this.$options.subscribe) {
                Socket.on('authenticated', () => {
                    this.$options.subscribe.forEach((channel) => {
                        Socket.invoke('join', channel);
                    });
                });
            }
        },

    });
}

export default install;
