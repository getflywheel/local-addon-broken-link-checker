

async function checkLinks(siteURL) {   

    console.log("Can i console log from here?");

    return "hello";
}

function callMaster() {
  process.send("Waffle king");
}
 
// receive message from master process
process.on('message', (m) => {
    console.log('Got message:', m);
    process.send(`I am the waffle king`);

    setTimeout(callMaster, 5000);
  });

