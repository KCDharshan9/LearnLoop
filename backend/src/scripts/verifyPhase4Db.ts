import { connectDatabase, disconnectDatabase } from '../database/connection.js'
import { LearnerSkillState, ProgressHistory, AssessmentAttempt } from '../models/index.js'

async function check() {
  await connectDatabase()

  const attempts = await AssessmentAttempt.find().countDocuments()
  const states = await LearnerSkillState.find().countDocuments()
  const history = await ProgressHistory.find().countDocuments()

  console.info(`MongoDB Verification:
- AssessmentAttempts in DB: ${attempts}
- LearnerSkillStates (Current snapshots): ${states}
- ProgressHistory records (Historical timeline): ${history}`)

  await disconnectDatabase()
}

check().catch(console.error)
