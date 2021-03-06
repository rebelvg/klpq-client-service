import { MongoClient, Db, Collection } from 'mongodb';

import { DB_HOST, DB_NAME } from '../config';

export interface IMigration {
  name: string;
  timeCreated: Date;
}

export interface IYoutubeCollection {
  endpoint: string;
  params: string;
  data: any;
  ip: string;
  createdDate: Date;
  expireDate: Date;
}

export interface ISyncCollection {
  id: string;
  channels: any;
  userId: string;
  ipCreated: string;
  ipUpdated: string;
  createdDate: Date;
  updateDate: Date;
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
  public static getCollection<T>(name: string): Collection<T> {
    return mongoClientDb.collection<T>(name);
  }

  public static get Migrations(): Collection<IMigration> {
    return mongoClientDb.collection<IMigration>('migrations');
  }

  public static get Youtube(): Collection<IYoutubeCollection> {
    return mongoClientDb.collection<IYoutubeCollection>('youtube');
  }

  public static get Sync(): Collection<ISyncCollection> {
    return mongoClientDb.collection<ISyncCollection>('sync');
  }
}
