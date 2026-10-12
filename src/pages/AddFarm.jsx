import FarmForm from '../components/FarmForm'

export default function AddFarm({ onSaved }) {
  return (
    <div>
      <h1>Add Farm</h1>
      <FarmForm onSaved={onSaved} />
    </div>
  )
}
