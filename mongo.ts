import { MongoClient, Db, Collection } from 'mongodb';

import { DB_HOST, DB_NAME } from './config';

export interface IMigration {
  name: string;
  timeCreated: Date;
}

export interface IYoutubeCollection {
  endpoint: string;
  data: any;
  createdDate: Date;
  expireDate: Date;
}

let mongoClientDb: Db;

export async function connectMongoDriver(): Promise<MongoClient> {
  const client = await MongoClient.connect(`mongodb://${DB_HOST}`, {
    useUnifiedTopology: true,
  });

  mongoClientDb = client.db(DB_NAME);

  return client;
}

export class MongoCollections {
  public static getCollection(name: string): Collection {
    return mongoClientDb.collection(name);
  }

  public static get migrations(): Collection<IMigration> {
    return mongoClientDb.collection<IMigration>('migrations');
  }

  public static get youtube(): Collection<IYoutubeCollection> {
    return mongoClientDb.collection<IYoutubeCollection>('youtube');
  }
}