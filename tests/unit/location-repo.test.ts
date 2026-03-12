import { describe, it, expect, beforeEach } from 'vitest';
import { LocationRepository } from '../../src/repositories/location-repo.js';
import { LocationNotFoundError } from '../../src/services/exceptions.js';
import { makeLocationCreate } from '../factories.js';

describe('LocationRepository', () => {
  let repo: LocationRepository;

  beforeEach(() => {
    repo = new LocationRepository();
  });

  describe('add', () => {
    it('creates a location with an id and timestamp', () => {
      const data = makeLocationCreate();
      const location = repo.add(data);

      expect(location.id).toBeDefined();
      expect(location.name).toBe(data.name);
      expect(location.coordinates.lat).toBe(data.lat);
      expect(location.coordinates.lon).toBe(data.lon);
      expect(location.createdAt).toBeDefined();
    });

    it('generates unique ids for each location', () => {
      const loc1 = repo.add(makeLocationCreate({ name: 'A' }));
      const loc2 = repo.add(makeLocationCreate({ name: 'B' }));
      expect(loc1.id).not.toBe(loc2.id);
    });
  });

  describe('get', () => {
    it('returns an existing location', () => {
      const created = repo.add(makeLocationCreate());
      const found = repo.get(created.id);
      expect(found).toEqual(created);
    });

    it('throws LocationNotFoundError for unknown id', () => {
      expect(() => repo.get('nonexistent')).toThrow(LocationNotFoundError);
    });
  });

  describe('listAll', () => {
    it('returns empty array when no locations exist', () => {
      expect(repo.listAll()).toEqual([]);
    });

    it('returns all locations sorted by createdAt', () => {
      const loc1 = repo.add(makeLocationCreate({ name: 'First' }));
      const loc2 = repo.add(makeLocationCreate({ name: 'Second' }));
      const all = repo.listAll();
      expect(all).toHaveLength(2);
      expect(all[0]!.id).toBe(loc1.id);
      expect(all[1]!.id).toBe(loc2.id);
    });
  });

  describe('delete', () => {
    it('removes an existing location', () => {
      const loc = repo.add(makeLocationCreate());
      expect(repo.delete(loc.id)).toBe(true);
      expect(repo.listAll()).toHaveLength(0);
    });

    it('throws LocationNotFoundError for unknown id', () => {
      expect(() => repo.delete('nonexistent')).toThrow(LocationNotFoundError);
    });

    it('actually removes the location (cannot get after delete)', () => {
      const loc = repo.add(makeLocationCreate());
      repo.delete(loc.id);
      expect(() => repo.get(loc.id)).toThrow(LocationNotFoundError);
    });
  });

  describe('update', () => {
    it('updates the name', () => {
      const loc = repo.add(makeLocationCreate({ name: 'Old' }));
      const updated = repo.update(loc.id, { name: 'New' });
      expect(updated.name).toBe('New');
      expect(updated.coordinates.lat).toBe(loc.coordinates.lat);
    });

    it('updates coordinates', () => {
      const loc = repo.add(makeLocationCreate());
      const updated = repo.update(loc.id, { lat: 10, lon: 20 });
      expect(updated.coordinates.lat).toBe(10);
      expect(updated.coordinates.lon).toBe(20);
      expect(updated.name).toBe(loc.name);
    });

    it('skips undefined fields', () => {
      const loc = repo.add(makeLocationCreate({ name: 'Keep' }));
      const updated = repo.update(loc.id, {});
      expect(updated.name).toBe('Keep');
    });

    it('throws LocationNotFoundError for unknown id', () => {
      expect(() => repo.update('nonexistent', { name: 'X' })).toThrow(LocationNotFoundError);
    });
  });
});
