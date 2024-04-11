import type {
  MirrorablePublication,
  UnknownOpenActionModuleSettings
} from '@hey/lens';
import type { FC } from 'react';

import Choices from '@components/Publication/Poll/Choices';
import { useModuleMetadataQuery } from '@hey/lens';
import { decodeAbiParameters } from 'viem';

interface PollOpenActionProps {
  module: UnknownOpenActionModuleSettings;
  publication?: MirrorablePublication;
}

const PollOpenAction: FC<PollOpenActionProps> = ({ module, publication }) => {
  const { data: moduleMetadata, loading: moduleMetadataLoading } =
    useModuleMetadataQuery({
      skip: !Boolean(module?.contract.address),
      variables: { request: { implementation: module?.contract.address } }
    });

  const metadata = moduleMetadata?.moduleMetadata?.metadata;

  const decoded = decodeAbiParameters(
    JSON.parse(metadata?.initializeCalldataABI || '{}'),
    module.initializeCalldata
  );

  if (!decoded[0]) {
    return null;
  }

  return <Choices decodedCallData={decoded} />;
};

export default PollOpenAction;
