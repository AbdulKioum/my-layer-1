import ListEditor from '../components/ListEditor'

export default function Vaccine() {
  return (
    <ListEditor
      title="Vaccine"
      hint="Add each vaccine with the age (in days) when it is needed. The Homepage comment uses this list."
      table="vaccines"
      orderCol="age_days"
      empty="No vaccine added yet."
      fields={[
        { key: 'age_days', label: 'Age (days)', type: 'number', required: true },
        { key: 'name', label: 'Vaccine Name', type: 'text', required: true },
        { key: 'vaccine_type', label: 'Vaccine Type', type: 'select', options: ['Live', 'Killed'] },
        {
          key: 'route',
          label: 'Route',
          type: 'select',
          options: [
            'Eye Drop',
            'Sub Cutaneous',
            'Eye Drop/Drinking Water',
            'Drinking Water',
            'Wing Web',
            'Sub Cutaneous/Muscle',
          ],
        },
        
        { key: 'note', label: 'Note', type: 'text' },
      ]}
    />
  )
}
