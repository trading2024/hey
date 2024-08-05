import type { Preferences } from '@hey/types/hey';

import { HEY_API_URL } from '@hey/data/constants';
import axios from 'axios';

/**
 * Get internal profile preferences
 * @param id profile id
 * @param headers auth headers
 * @returns profile preferences
 */
const getInternalPreferences = async (
  id: string,
  headers: any
): Promise<Preferences> => {
  try {
    const response: { data: { result: Preferences } } = await axios.get(
      `${HEY_API_URL}/internal/preferences/get`,
      { headers, params: { id } }
    );

    return response.data.result;
  } catch {
    return {
      appIcon: 0,
      email: null,
      emailVerified: false,
      features: [],
      hasDismissedOrMintedMembershipNft: true,
      highSignalNotificationFilter: false
    };
  }
};

export default getInternalPreferences;
