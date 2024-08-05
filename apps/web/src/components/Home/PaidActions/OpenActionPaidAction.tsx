import type {
  AnyPublication,
  LatestActed,
  MultirecipientFeeCollectOpenActionSettings,
  SimpleCollectOpenActionSettings
} from '@hey/lens';
import type { FC } from 'react';

import SmallUserProfile from '@components/Shared/SmallUserProfile';
import getCollectModuleData from '@hey/helpers/getCollectModuleData';
import getTokenImage from '@hey/helpers/getTokenImage';
import { isMirrorPublication } from '@hey/helpers/publicationHelpers';

interface OpenActionPaidActionProps {
  latestActed: LatestActed[];
  publication: AnyPublication;
}

const OpenActionPaidAction: FC<OpenActionPaidActionProps> = ({
  latestActed,
  publication
}) => {
  const targetPublication = isMirrorPublication(publication)
    ? publication.mirrorOn
    : publication;

  const openActions = targetPublication.openActionModules
    .filter(
      (module) =>
        module.__typename === 'MultirecipientFeeCollectOpenActionSettings' ||
        module.__typename === 'SimpleCollectOpenActionSettings'
    )
    .map((module) =>
      getCollectModuleData(
        module as
          | MultirecipientFeeCollectOpenActionSettings
          | SimpleCollectOpenActionSettings
      )
    );

  return (
    <div className="px-5 py-3 text-sm">
      {openActions.map((openAction, index) => (
        <div
          className="flex items-center space-x-2"
          key={`${openAction?.assetAddress}_${index}}`}
        >
          <b>Collected for</b>
          <img
            alt={openAction?.assetSymbol}
            className="size-5"
            src={getTokenImage(openAction?.assetSymbol as string)}
          />
          <span>
            {openAction?.amount} {openAction?.assetSymbol}
          </span>
          <span>by</span>
          <span>
            <SmallUserProfile
              hideSlug
              linkToProfile
              profile={latestActed[0].profile}
              smallAvatar
              timestamp={latestActed[0].actedAt}
            />
          </span>
        </div>
      ))}
    </div>
  );
};

export default OpenActionPaidAction;
