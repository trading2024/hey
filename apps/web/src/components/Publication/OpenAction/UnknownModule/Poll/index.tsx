import type {
  MirrorablePublication,
  UnknownOpenActionModuleSettings
} from '@hey/lens';
import type { FC } from 'react';

import { useModuleMetadataQuery } from '@hey/lens';
import stopEventPropagation from '@hey/lib/stopEventPropagation';
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

  console.log(decoded);

  return (
    <div className="w-fit max-w-sm space-y-5" onClick={stopEventPropagation}>
      gm
    </div>
  );
};

export default PollOpenAction;
