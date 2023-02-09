
import { StatusBar, StyleSheet, Text, View } from 'react-native';
let { Peer, BlockStore } = require('@textile/ipfs-lite')
let { setupLibP2PHost } = require('@textile/ipfs-lite/dist/setup')
let { MemoryDatastore } = require('interface-datastore')

let store = new BlockStore(new MemoryDatastore())

  ; (async function () {
    let host = await setupLibP2PHost()
    let lite = new Peer(store, host)
    await lite.start()

    let cid = 'QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u'
    let data = await lite.getFile(cid)
    console.log(data.toString())
    // Hello World
    await lite.stop()
  })()

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <StatusBar barStyle={'dark-content'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
