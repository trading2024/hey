import type { FC } from 'react';

import Beta from '@components/Shared/Badges/Beta';
import {
  Bars3BottomLeftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid';
import { Errors } from '@hey/data/errors';
import { PUBLICATION } from '@hey/data/tracking';
import getTimetoNow from '@hey/lib/datetime/getTimetoNow';
import humanize from '@hey/lib/humanize';
import stopEventPropagation from '@hey/lib/stopEventPropagation';
import { Card, Spinner } from '@hey/ui';
import cn from '@hey/ui/cn';
import { Leafwatch } from '@lib/leafwatch';
import plur from 'plur';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useProfileRestriction } from 'src/store/non-persisted/useProfileRestriction';
import { useProfileStore } from 'src/store/persisted/useProfileStore';
import { hexToString } from 'viem';

interface ChoicesProps {
  decodedCallData: any[];
}

const Choices: FC<ChoicesProps> = ({ decodedCallData }) => {
  const { currentProfile } = useProfileStore();
  const { isSuspended } = useProfileRestriction();
  const [pollSubmitting, setPollSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<null | number>(null);

  const { endsAt, options } = {
    endsAt: new Date(),
    options: decodedCallData[0].options.map((option: `0x${string}`) =>
      hexToString(option, { size: 32 })
    ) as string[]
  };

  const votePoll = (id: number) => {
    if (!currentProfile) {
      return toast.error(Errors.SignWallet);
    }

    if (isSuspended) {
      return toast.error(Errors.Suspended);
    }

    try {
      setPollSubmitting(true);
      setSelectedOption(id);

      // TODO: Add poll vote

      Leafwatch.track(PUBLICATION.WIDGET.POLL.VOTE, { poll_id: id });
      toast.success('Your poll has been casted!');
    } catch {
      toast.error(Errors.SomethingWentWrong);
    } finally {
      setPollSubmitting(false);
    }
  };

  const isPollLive = new Date(endsAt) > new Date();

  return (
    <Card className="mt-3" onClick={stopEventPropagation}>
      <div className="space-y-1 p-3">
        {options.map((option, index) => (
          <button
            className="flex w-full items-center space-x-2.5 rounded-xl p-2 text-left text-xs hover:bg-gray-100 sm:text-sm dark:hover:bg-gray-900"
            disabled={!isPollLive || pollSubmitting}
            key={index}
            onClick={() => votePoll(index)}
            type="button"
          >
            {pollSubmitting && index === selectedOption ? (
              <Spinner className="mr-1" size="sm" />
            ) : (
              <CheckCircleIcon
                className={cn(
                  true ? 'text-green-500' : 'text-gray-500',
                  'size-6 '
                )}
              />
            )}
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between">
                <b>{option}</b>
                <div>
                  <span className="ld-text-gray-500">10%</span>
                </div>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-300 dark:bg-gray-800">
                <div className="bg-green-500" style={{ width: `${10}%` }} />
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t px-5 py-3 dark:border-gray-700 ">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <Bars3BottomLeftIcon className="size-4" />
          <span>
            {humanize(10 || 0)} {plur('vote', 10 || 0)}
          </span>
          <span>·</span>
          {isPollLive ? (
            <span>{getTimetoNow(new Date(endsAt))} left</span>
          ) : (
            <span>Poll ended</span>
          )}
        </div>
        <Beta />
      </div>
    </Card>
  );
};

export default Choices;
