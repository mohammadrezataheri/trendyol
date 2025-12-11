// import { v4 as uuidV4 } from 'uuid';

export default class RclController {
  private timeout = 30000;

  constructor({ timeout }: { timeout?: number } = {}) {
    this.timeout = timeout;
  }
  memory: { id: string; key: string }[] = [];

  addKeys(key: string) {
    let id = '55';
    this.memory.push({ key, id });

    setTimeout(() => {
      this.delete(id);
      console.log('memory', this.memory);
    }, this.timeout);

    return id;
  }

  checkKey(key1: string) {
    return !!this.memory.find(({ key }) => key == key1);
  }

  delete(id: string) {
    this.memory = this.memory.filter((i) => i.id != id);
  }
}
