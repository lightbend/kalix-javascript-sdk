import akkaserverless from "@lightbend/akkaserverless-javascript-sdk";
import { expect } from "chai";
import counter from "../src/counter.js";

const testkit = new akkaserverless.IntegrationTestkit();
testkit.addComponent(counter);

function client() {
  return testkit.clients.CounterService;
}

describe("Counter service", function() {

  this.timeout(60000);

  before(done => testkit.start(done));
  after(done => testkit.shutdown(done));

  it("should increase non existing entity", async () => {
    const entityId = "new-id";
    await client().increaseAsync({ counterId: entityId, value: 42 });
    const result = await client().getCurrentCounterAsync({ counterId: entityId });
    expect(result).to.deep.equal({ value: 42 });
  });

  it("should increase another entity", async () => {
    const entityId = "another-id";
    await client().increaseAsync({ counterId: entityId, value: 42 });
    await client().increaseAsync({ counterId: entityId, value: 27 });
    const result = await client().getCurrentCounterAsync({ counterId: entityId });
    expect(result).to.deep.equal({ value: 69 });
  });

});
