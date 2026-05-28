import { prisma } from '../../utils/prisma.utils';
import { ActivityQueryType } from './activity.schemas';

const prismaClient = prisma as unknown as Record<string, any>;

// Return an empty result when Prisma or the activity model is unavailable
export async function fetchActivityFeed(
    query: ActivityQueryType
): Promise<[any[], number]> {
    const { limit, offset, creatorId, actor, type } = query;

    const where: any = {};
    if (creatorId) where.creatorId = creatorId;
    if (actor) where.actor = actor;
    if (type) where.type = type;

    if (!prismaClient.activity) {
        return [[], 0];
    }

    const [items, total] = await Promise.all([
        prismaClient.activity.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
        }),
        prismaClient.activity.count({ where }),
    ]);

    return [items, total];
}
