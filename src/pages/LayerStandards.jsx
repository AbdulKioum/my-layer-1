import ListEditor from '../components/ListEditor'
import { BREEDS } from '../constants'

export default function LayerStandards({ isAdmin }) {
  return (
    <ListEditor
      title="Layer Standards"
      table="layer_standards"
      orderCol="age_weeks"
      groupBy="breed" 
      empty="No standard data added yet."
      readOnly={!isAdmin}
      fields={[
        { key: 'breed', label: 'Breed', type: 'select', options: BREEDS, required: true },
        { key: 'age_weeks', label: 'Age (Weeks)', type: 'number', required: true },
        { key: 'daily_feed_intake', label: 'Daily Feed (g)', type: 'number' },
        { key: 'cumulative_feed', label: 'Cum. Feed (kg)', type: 'number' },
        { key: 'body_weight_min', label: 'Min Weight (g)', type: 'number' },
        { key: 'body_weight_max', label: 'Max Weight (g)', type: 'number' },
        { key: 'egg_production_pct', label: 'Egg Prod. (%)', type: 'number' },
        { key: 'egg_weight', label: 'Egg Weight (g)', type: 'number' },
      ]}
    />
  )
}