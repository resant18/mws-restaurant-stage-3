function registerServiceWorker() {
  // check whether Sevice Worker support exist in browser or not
  if ('serviceWorker' in navigator) {
    // to improve boilerplate, delay the service worker registration until after load event fires on window  
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', {scope: '/'}).then((registration) => {  
        // registration worked      
        console.log('Service worker registration succeeded. Scope is ' + registration.scope);              

        // If there’s no controller that means this page didn’t load using service worker, 
        // but load the content from the network taking the latest version. In that case, exit early.
        if (!navigator.serviceWorker.controller) {
          console.log('This page is not currently controlled by a service worker.');
          return;
        }
        
        if (registration.waiting) {
          updateReady(registration.waiting);
          console.log('Service worker is waiting');
          return;
        }

        if (registration.installing) {
          trackInstalling(registration.installing);
          console.log('Service worker is installing');
          return;
        }
    
        registration.addEventListener('updatefound', () => {
          trackInstalling(registration.installing);
          console.log('New update is found');
          return;
        });
      })
      .catch( (error) => {
        // registration failed    
        console.log('Registration failed with ' + error);   
        return;
      });

      // Ensure refresh is only called once.
      // This works around a bug in "force update on reload".
      // It is fired whenever the document's controlled by service worker acquires new worker.
      var refreshing;
      navigator.serviceWorker.addEventListener('controllerchange', () => {        
        //console.log('Reload...');
        window.location.reload();        
      });
    });
  } else {
    console.log('Service worker is not supported by your browser'); 
    return;
  }
}

function updateReady(worker) {
  /*var toast = this._toastsView.show("New version available", {
    buttons: ['refresh', 'dismiss']
  });

  toast.answer.then(function(answer) {
    if (answer != 'refresh') return;*/
    window.alert('New update found');
    worker.postMessage({action: 'skipWaiting'});
  //});
}

 function trackInstalling(worker) {  
  worker.addEventListener('statechange', () => {
    if (worker.state == 'installed') {
      updateReady(worker);
    }
  });
};

registerServiceWorker();