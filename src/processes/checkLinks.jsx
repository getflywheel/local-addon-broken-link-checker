

async function checkLinks(siteURL) {   


    return "hello";
}

 
// receive message from master process
process.on('message', (m) => {
  console.log('Got message:', m);
  process.send(m);
});

