import type { ControllerType, Factory } from 'ipfsd-ctl';
let factory: Factory<ControllerType>;

const createFactory = async () => {
  const goIpfsModule = require('go-ipfs');
  const ipfsHTTpModule = await import('ipfs-http-client');
  const ipfsModule = await import('ipfs');
  const Ctl = await import('ipfsd-ctl');
  factory = Ctl.createFactory(
    {
      type: 'js', // default type, can be overridden per spawn
      test: true,
      disposable: true,
      ipfsHttpModule: ipfsHTTpModule,
      ipfsModule: ipfsModule, // only if you gonna spawn 'proc' controllers
    },
    {
      // overrides per type
      js: {
        ipfsBin: ipfsModule.path(),
      },
      go: {
        ipfsBin: goIpfsModule.path(),
      },
    },
  );
};

export const getFactory = async () => {
  if (!factory) {
    await createFactory();
  }
  return factory;
};
