const geoDist = require("./geoDist");
(async function () {
  const MongoClient = require("mongodb").MongoClient;
  try {
    const client = await MongoClient.connect("mongodb://localhost:27017");
    let db = await client.db("nareshDb");
    let col = db.collection("gps");
    let docs = await col
      .aggregate([{ $project: { time: 1, latitude: 1, longitude: 1 } }])
      .toArray();
    docs = docs.sort((a, b) => {
      return a.time > b.time ? 1 : -1;
    });
    let currentDate = new Date(Number(docs[0].time)).toLocaleDateString();
    let result = {};
    let distance = 0;
    col.updateOne(
      { _id: docs[0]._id },
      { $set: { dayStart: true, distance: 0 } }
    );
    for (let index = 1; index < docs.length; index++) {
      if (
        new Date(Number(docs[index].time)).toLocaleDateString() != currentDate
      ) {
        result[currentDate] =
          Math.round((distance / 1000 + Number.EPSILON) * 100) / 100;
        distance = 0;
        currentDate = new Date(Number(docs[index].time)).toLocaleDateString();
        col.updateOne(
          { _id: docs[index]._id },
          { $set: { dayStart: true, distance: 0, preDoc: docs[index - 1]._id } }
        );
        continue;
      }
      let dist = geoDist.getDistanceFromLatLon({
        lat1: docs[index - 1].latitude,
        lon1: docs[index - 1].longitude,
        lat2: docs[index].latitude,
        lon2: docs[index].longitude,
      });
      distance += dist;

      col.updateOne(
        { _id: docs[index]._id },
        {
          $set: { dayStart: null, distance: dist, preDoc: docs[index - 1]._id },
        }
      );
    }
  } catch (err) {
    console.log("Err connecting  mongodb", err);
  }
})();
