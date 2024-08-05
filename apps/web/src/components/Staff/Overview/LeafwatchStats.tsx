import type { FC } from 'react';

import Loader from '@components/Shared/Loader';
import { getAuthApiHeaders } from '@helpers/getAuthApiHeaders';
import { HEY_API_URL } from '@hey/data/constants';
import {
  ExploreProfilesOrderByType,
  LimitType,
  useExploreProfilesQuery
} from '@hey/lens';
import { CardHeader, ErrorMessage, NumberedStat } from '@hey/ui';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';

import ActiveUsers from './ActiveUsers';
import EventsToday from './EventsToday';
import ImpressionsToday from './ImpressionsToday';
import Referrers from './Referrers';

export interface StatsType {
  dau: {
    date: string;
    dau: string;
    events: string;
    impressions: string;
  }[];
  events: {
    all_time: string;
    last_1_hour: string;
    this_month: string;
    this_week: string;
    today: string;
    yesterday: string;
  };
  eventsToday: {
    count: string;
    timestamp: string;
  }[];
  impressions: {
    all_time: string;
    last_1_hour: string;
    this_month: string;
    this_week: string;
    today: string;
    yesterday: string;
  };
  impressionsToday: {
    count: string;
    timestamp: string;
  }[];
  referrers: {
    count: string;
    referrer: string;
  }[];
}

const LeafwatchStats: FC = () => {
  const [lensProfiles, setLensProfiles] = useState(0);

  const getStats = async (): Promise<StatsType> => {
    const response: {
      data: StatsType;
    } = await axios.get(`${HEY_API_URL}/internal/leafwatch/stats`, {
      headers: getAuthApiHeaders()
    });

    return response.data;
  };

  const { data, error, isLoading } = useQuery({
    queryFn: getStats,
    queryKey: ['getStats'],
    refetchInterval: 5000
  });

  useExploreProfilesQuery({
    fetchPolicy: 'no-cache',
    notifyOnNetworkStatusChange: true,
    onCompleted: (data) =>
      setLensProfiles(parseInt(data.exploreProfiles.items[0].id)),
    pollInterval: 5000,
    variables: {
      request: {
        limit: LimitType.Ten,
        orderBy: ExploreProfilesOrderByType.LatestCreated
      }
    }
  });

  if (isLoading) {
    return <Loader className="my-10" message="Loading stats..." />;
  }

  if (error) {
    return <ErrorMessage error={error} title="Failed to load stats" />;
  }

  if (!data) {
    return <div className="m-5">No data...</div>;
  }

  const { events, impressions } = data;

  return (
    <>
      <div>
        <CardHeader title="Events" />
        <div className="m-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <NumberedStat count={events.last_1_hour} name="Last 1 hour" />
          <NumberedStat count={events.today} name="Today" />
          <NumberedStat count={events.yesterday} name="Yesterday" />
          <NumberedStat count={events.this_week} name="This week" />
          <NumberedStat count={events.this_month} name="This month" />
          <NumberedStat count={events.all_time} name="All time" />
        </div>
      </div>
      <div>
        <div className="divider" />
        <CardHeader title="Impressions" />
        <div className="m-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <NumberedStat count={impressions.last_1_hour} name="Last 1 hour" />
          <NumberedStat count={impressions.today} name="Today" />
          <NumberedStat count={impressions.yesterday} name="Yesterday" />
          <NumberedStat count={impressions.this_week} name="This week" />
          <NumberedStat count={impressions.this_month} name="This month" />
          <NumberedStat count={impressions.all_time} name="All time" />
        </div>
      </div>
      <div>
        <div className="divider" />
        <CardHeader title="Others" />
        <div className="m-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <NumberedStat count={lensProfiles.toString()} name="Total Profiles" />
        </div>
      </div>
      <EventsToday eventsToday={data.eventsToday} />
      <ImpressionsToday impressionsToday={data.impressionsToday} />
      <ActiveUsers activeUsers={data.dau} />
      <Referrers referrers={data.referrers} />
    </>
  );
};

export default LeafwatchStats;
