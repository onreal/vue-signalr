# vue-signalr
This is a fork from original vue-signalr from @latelier. On this fork you are able to :
* use the .stop() method in order to stop signalr process
* when you set options log to false then, also microsoft signalr logs are disabled
* many bug fixes and optimizations from the original package

Enjoy!

## Installation


```console
$ npm install @onreal/vue-signalr --save
```

## Get started


```js
import Vue from 'vue'
import VueSignalR from 'vue-signalr'

Vue.use(VueSignalR, 'SOCKET_URL');

new Vue({
  el: '#app',
  render: h => h(App),
  
  created() {
    this.$socket.start({
      log: false // Active only in development for debugging.
    });
  },

});
```

## Example with component

```js
Vue.extend({

  ...
  
  methods: {
  
    someMethod() {
      this.$socket.invoke('socketName', payloadData)
        .then(response => {
          ...
        })
    }
    
    async someAsyncMethod() {
      const response = await this.$socket.invoke('socketName', payloadData)
      ...
    }
    
  },

  // Register your listener here. 
  sockets: {
  
    // Equivalent of
    // signalrHubConnection.on('someEvent', (data) => this.someActionWithData(data))
    someEvent(data) {
      this.someActionWithData(data)
    }
    
    otherSomeEvent(data) {
      this.otheSomeActionWithOtherSomeData(data)
    }
    
  }

});


```
