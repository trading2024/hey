import type {
  ApprovedAllowanceAmountResult,
  FeeFollowModuleSettings,
  Profile
} from '@hey/lens';
import type { Dispatch, FC, SetStateAction } from 'react';

import AllowanceButton from '@components/Settings/Allowance/Button';
import Loader from '@components/Shared/Loader';
import NoBalanceError from '@components/Shared/NoBalanceError';
import Slug from '@components/Shared/Slug';
import errorToast from '@helpers/errorToast';
import { Leafwatch } from '@helpers/leafwatch';
import { StarIcon, UserIcon } from '@heroicons/react/24/outline';
import { LensHub } from '@hey/abis';
import { LENS_HUB, POLYGONSCAN_URL } from '@hey/data/constants';
import { Errors } from '@hey/data/errors';
import { PROFILE } from '@hey/data/tracking';
import checkDispatcherPermissions from '@hey/helpers/checkDispatcherPermissions';
import formatAddress from '@hey/helpers/formatAddress';
import getProfile from '@hey/helpers/getProfile';
import getSignature from '@hey/helpers/getSignature';
import getTokenImage from '@hey/helpers/getTokenImage';
import {
  FollowModuleType,
  useApprovedModuleAllowanceAmountQuery,
  useBroadcastOnchainMutation,
  useCreateFollowTypedDataMutation,
  useProfileQuery
} from '@hey/lens';
import { useApolloClient } from '@hey/lens/apollo';
import { Button, H3, H5, Spinner, WarningMessage } from '@hey/ui';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useHandleWrongNetwork from 'src/hooks/useHandleWrongNetwork';
import { useNonceStore } from 'src/store/non-persisted/useNonceStore';
import { useProfileStatus } from 'src/store/non-persisted/useProfileStatus';
import { useProfileStore } from 'src/store/persisted/useProfileStore';
import { formatUnits } from 'viem';
import { useBalance, useSignTypedData, useWriteContract } from 'wagmi';

interface FollowModuleProps {
  profile: Profile;
  setShowFollowModal: Dispatch<SetStateAction<boolean>>;
}

const FollowModule: FC<FollowModuleProps> = ({
  profile,
  setShowFollowModal
}) => {
  const { pathname } = useRouter();
  const {
    decrementLensHubOnchainSigNonce,
    incrementLensHubOnchainSigNonce,
    lensHubOnchainSigNonce
  } = useNonceStore();
  const { currentProfile } = useProfileStore();
  const { isSuspended } = useProfileStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [allowed, setAllowed] = useState(true);

  const handleWrongNetwork = useHandleWrongNetwork();
  const { cache } = useApolloClient();

  const { canBroadcast } = checkDispatcherPermissions(currentProfile);

  const updateCache = () => {
    cache.modify({
      fields: {
        isFollowedByMe: (existingValue) => {
          return { ...existingValue, value: true };
        }
      },
      id: cache.identify(profile.operations)
    });
  };

  const onCompleted = (__typename?: 'RelayError' | 'RelaySuccess') => {
    if (__typename === 'RelayError') {
      return;
    }

    updateCache();
    setIsLoading(false);
    setShowFollowModal(false);
    toast.success('Followed successfully!');
    Leafwatch.track(PROFILE.SUPER_FOLLOW, {
      path: pathname,
      target: profile?.id
    });
  };

  const onError = (error: any) => {
    setIsLoading(false);
    errorToast(error);
  };

  const { signTypedDataAsync } = useSignTypedData({ mutation: { onError } });
  const { writeContractAsync } = useWriteContract({
    mutation: {
      onError: (error: Error) => {
        onError(error);
        decrementLensHubOnchainSigNonce();
      },
      onSuccess: () => {
        onCompleted();
        incrementLensHubOnchainSigNonce();
      }
    }
  });

  const write = async ({ args }: { args: any[] }) => {
    return await writeContractAsync({
      abi: LensHub,
      address: LENS_HUB,
      args,
      functionName: 'follow'
    });
  };

  const { data, loading } = useProfileQuery({
    skip: !profile?.id,
    variables: { request: { forProfileId: profile?.id } }
  });

  const followModule = data?.profile?.followModule as FeeFollowModuleSettings;

  const amount = parseFloat(followModule?.amount?.value || '0');
  const currency = followModule?.amount?.asset?.symbol;
  const assetName = followModule?.amount?.asset?.name;

  const { data: allowanceData, loading: allowanceLoading } =
    useApprovedModuleAllowanceAmountQuery({
      fetchPolicy: 'no-cache',
      onCompleted: ({ approvedModuleAllowanceAmount }) => {
        const allowedAmount = parseFloat(
          approvedModuleAllowanceAmount[0]?.allowance.value
        );
        setAllowed(allowedAmount > amount);
      },
      skip: !followModule?.amount?.asset?.contract.address || !currentProfile,
      variables: {
        request: {
          currencies: followModule?.amount?.asset?.contract.address,
          followModules: [FollowModuleType.FeeFollowModule],
          openActionModules: [],
          referenceModules: []
        }
      }
    });

  const { data: balanceData } = useBalance({
    address: currentProfile?.ownedBy.address,
    query: { refetchInterval: 2000 },
    token: followModule?.amount?.asset?.contract.address
  });
  let hasAmount = false;

  if (
    balanceData &&
    parseFloat(
      formatUnits(balanceData.value, followModule?.amount?.asset?.decimals)
    ) < amount
  ) {
    hasAmount = false;
  } else {
    hasAmount = true;
  }

  const [broadcastOnchain] = useBroadcastOnchainMutation({
    onCompleted: ({ broadcastOnchain }) =>
      onCompleted(broadcastOnchain.__typename)
  });
  const [createFollowTypedData] = useCreateFollowTypedDataMutation({
    onCompleted: async ({ createFollowTypedData }) => {
      const { id, typedData } = createFollowTypedData;
      const {
        datas,
        followerProfileId,
        followTokenIds,
        idsOfProfilesToFollow
      } = typedData.value;
      const args = [
        followerProfileId,
        idsOfProfilesToFollow,
        followTokenIds,
        datas
      ];
      await handleWrongNetwork();

      if (canBroadcast) {
        const signature = await signTypedDataAsync(getSignature(typedData));
        const { data } = await broadcastOnchain({
          variables: { request: { id, signature } }
        });
        if (data?.broadcastOnchain.__typename === 'RelayError') {
          return await write({ args });
        }

        return;
      }

      return await write({ args });
    },
    onError
  });

  const createFollow = async () => {
    if (!currentProfile) {
      return toast.error(Errors.SignWallet);
    }

    if (isSuspended) {
      return toast.error(Errors.Suspended);
    }

    try {
      setIsLoading(true);
      return await createFollowTypedData({
        variables: {
          options: { overrideSigNonce: lensHubOnchainSigNonce },
          request: {
            follow: [
              {
                followModule: {
                  feeFollowModule: {
                    amount: {
                      currency: followModule?.amount?.asset?.contract.address,
                      value: followModule?.amount?.value
                    }
                  }
                },
                profileId: profile?.id
              }
            ]
          }
        }
      });
    } catch (error) {
      onError(error);
    }
  };

  if (loading) {
    return <Loader className="my-5" message="Loading Super follow" />;
  }

  return (
    <div className="p-5">
      <div className="space-y-1.5 pb-2">
        <H5>
          Super follow <Slug slug={getProfile(profile).slugWithPrefix} />
        </H5>
        <div className="ld-text-gray-500">
          Follow and get some awesome perks!
        </div>
      </div>
      <div className="flex items-center space-x-1.5 py-2">
        <img
          alt={currency}
          className="size-7"
          height={28}
          src={getTokenImage(currency)}
          title={assetName}
          width={28}
        />
        <span className="space-x-1">
          <H3>{amount}</H3>
          <span className="text-xs">{currency}</span>
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <UserIcon className="ld-text-gray-500 size-4" />
        <div className="space-x-1.5">
          <span>Recipient:</span>
          <Link
            className="font-bold text-gray-600"
            href={`${POLYGONSCAN_URL}/address/${followModule?.recipient}`}
            rel="noreferrer noopener"
            target="_blank"
          >
            {formatAddress(followModule?.recipient)}
          </Link>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <div>Perks you get</div>
        <ul className="ld-text-gray-500 space-y-1 text-sm">
          <li className="flex space-x-2 leading-6 tracking-normal">
            <div>•</div>
            <div>
              You can comment on {getProfile(profile).slugWithPrefix}'s
              publications
            </div>
          </li>
          <li className="flex space-x-2 leading-6 tracking-normal">
            <div>•</div>
            <div>
              You can collect {getProfile(profile).slugWithPrefix}'s
              publications
            </div>
          </li>
          <li className="flex space-x-2 leading-6 tracking-normal">
            <div>•</div>
            <div>
              You will get Super follow badge in{' '}
              {getProfile(profile).slugWithPrefix}'s profile
            </div>
          </li>
          <li className="flex space-x-2 leading-6 tracking-normal">
            <div>•</div>
            <div>More coming soon™</div>
          </li>
        </ul>
      </div>
      {currentProfile ? (
        allowanceLoading ? (
          <div className="shimmer mt-5 h-[34px] w-28 rounded-lg" />
        ) : allowed ? (
          hasAmount ? (
            <Button
              className="mt-5 !px-3 !py-1.5 text-sm"
              disabled={isLoading}
              icon={
                isLoading ? (
                  <Spinner size="xs" />
                ) : (
                  <StarIcon className="size-4" />
                )
              }
              onClick={createFollow}
              outline
            >
              Super follow now
            </Button>
          ) : (
            <WarningMessage
              className="mt-5"
              message={<NoBalanceError moduleAmount={followModule.amount} />}
            />
          )
        ) : (
          <div className="mt-5">
            <AllowanceButton
              allowed={allowed}
              module={
                allowanceData
                  ?.approvedModuleAllowanceAmount[0] as ApprovedAllowanceAmountResult
              }
              setAllowed={setAllowed}
              title="Allow follow module"
            />
          </div>
        )
      ) : null}
    </div>
  );
};

export default FollowModule;
