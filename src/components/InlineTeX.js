import React, { Component } from 'react'
import MathJaxNode from './MathJaxNode'
import TeXInput from './TeXInput'
import { finishEdit, saveTeX } from '../modifiers/utils'
import Styles from './styles'

const styles = Styles.inline

export default class InlineTeX extends Component {

  constructor(props) {
    super(props)

    this.state = this.getInitialState()

    this._update = (key) => {
      if (this.state.editMode) return
      const store = this.props.getStore()

      this.setState({ editMode: true }, () => {
        store.setReadOnly(true)
        if (key) { store.teXToUpdate = {} }
      })
    }

    this.onChange = (newState, cb = () => {}) => {
      // Ne serait-ce pas mieux (plus simple) que l'entité
      // porte l'état du composant (sauf editMode) ?
      // Nécessite une grosse reprise du code...

      // const {editMode, ...data} = newState
      // const {
      //   getEditorState: get,
      //   setEditorState: set,
      //   entityKey: ek
      // } = this.props
      // const es = get()
      // const cs = es.getCurrentContent()
      // set(EditorState.set(es, {
      //   currentContent: cs.mergeEntityData(
      //     ek, data
      //   )
      // }))

      this.setState(newState, cb)
    }

    this.getCaretPos = () => {
      const { dir } = this.props.getStore().teXToUpdate
      if (!dir || dir === 'l') { return this.state.teX.length }
      return 0
    }

    this.save = (after) => {
      this.setState({ editMode: false }, () => {
        const store = this.props.getStore()
        const { teX, displaystyle } = this.state
        const { entityKey, children } = this.props
        const contentState = this.getCurrentEditorContent()
        store.updateMostUsedTeXCmds(
          teX,
          contentState.getEntity(entityKey).getData().teX,
        )
        finishEdit(store)(
          ...saveTeX({
            after,
            contentState,
            teX,
            displaystyle,
            entityKey,
            ...React.Children.map(children, c => ({
              blockKey: c.props.blockKey,
              startPos: c.props.start,
            }))[0],
          }),
        )
      })
    }
  }

  getInitialState(entityKey = this.props.entityKey) {
    const contentState = this.getCurrentEditorContent()
    const entity = contentState.getEntity(entityKey)
    const { teX, displaystyle } = entity.getData()
    // return entity.getData()
    return { editMode: teX.length === 0, teX, displaystyle }
  }

  componentWillMount() {
    const store = this.props.getStore()
    if (this.state.editMode) {
      store.setReadOnly(true)
    }
  }

  componentWillReceiveProps(nextProps) {
    const { entityKey } = nextProps
    const store = nextProps.getStore()
    const { key } = store.teXToUpdate
    if (key === entityKey) {
      this._update(key)
    }
    if (this.props.entityKey === entityKey) return
    // un composant est «recyclé» !!!
    // arrive lorsqu'on insère une entité avant une entité de même
    // type dans un même block
    const newInternalState = this.getInitialState(entityKey)
    this.setState(
      newInternalState,
      () =>
      newInternalState.editMode &&
      store.setReadOnly(true),
    )
  }

  getCurrentEditorContent() {
    return this.props.getStore().getEditorState().getCurrentContent()
  }

  render() {
    const { editMode, teX, displaystyle } = this.state

    const store = this.props.getStore()
    const mostUsedCommands = store.getMostUsedTeXCmds()
    const teXCommands = store.teXCommandsAndMacros

    let input = null
    if (editMode) {
      input = (
        <TeXInput
          onChange={this.onChange}
          teX={teX}
          displaystyle={displaystyle}
          finishEdit={this.save}
          mostUsedCommands={mostUsedCommands}
          teXCommands={teXCommands}
          caretPosFn={this.getCaretPos}
          style={styles.edit}
        />
      )
    }

    const texContent =
      (displaystyle ? '\\displaystyle{' : '') +
      teX +
      (displaystyle ? '}' : '')

    const rendered = (
      <MathJaxNode inline>
        {texContent}
      </MathJaxNode>
    )

    const style = styles[(editMode ? 'preview' : 'rendered')]
    return (
      <span
        style={{ position: editMode ?
          'relative' : undefined,
        }}
      >
        {input}
        <span
          onClick={() => this._update()}
          style={style}
          contentEditable={false}
        >
          {rendered}
        </span>
      </span>
    )
  }
}

