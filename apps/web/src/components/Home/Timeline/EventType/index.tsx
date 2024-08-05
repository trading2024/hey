import type { FeedItem } from '@hey/lens';
import type { FC } from 'react';

import stopEventPropagation from '@hey/helpers/stopEventPropagation';

import Combined from './Combined';
import Mirrored from './Mirrored';

const getCanCombined = (aggregations: number[]) => {
  // show combined reactions if more than 2 items in aggregations
  return aggregations.filter((n) => n > 0).length > 1;
};

interface ActionTypeProps {
  feedItem: FeedItem;
}

const ActionType: FC<ActionTypeProps> = ({ feedItem }) => {
  const { mirrors } = feedItem;

  const canCombined = getCanCombined([mirrors?.length || 0]);

  return (
    <span onClick={stopEventPropagation}>
      {canCombined ? (
        <Combined feedItem={feedItem} />
      ) : mirrors?.length ? (
        <Mirrored mirrors={mirrors} />
      ) : null}
    </span>
  );
};

export default ActionType;
